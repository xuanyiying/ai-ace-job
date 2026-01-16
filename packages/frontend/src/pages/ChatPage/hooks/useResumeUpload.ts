import { useState, useCallback } from 'react';
import { message } from 'antd';
import { resumeService } from '../../../services/resume-service';
import {
  MessageRole,
  type MessageItem,
  type AttachmentStatus,
  type Resume,
  type ParsedResumeData,
} from '../../../types';

interface UseResumeUploadProps {
  currentConversationId?: string;
  onResumeParsed?: (
    resumeId: string,
    markdown: string,
    conversationId?: string
  ) => void;
}

export const useResumeUpload = ({
  currentConversationId,
  onResumeParsed,
}: UseResumeUploadProps) => {
  const [uploadItems, setUploadItems] = useState<MessageItem[]>([]);
  const [failedFiles, setFailedFiles] = useState<Map<string, File>>(new Map());

  const updateAttachmentStatus = useCallback(
    (
      key: string,
      update: Partial<AttachmentStatus>,
      mode?: 'upload' | 'parse'
    ) => {
      setUploadItems((prev) =>
        prev.map((item) => {
          if (
            item.type === 'attachment' &&
            (item.key === key ||
              item.attachmentStatus?.fileName === key ||
              item.attachmentStatus?.resumeId === key) &&
            (!mode || item.attachmentStatus?.mode === mode)
          ) {
            return {
              ...item,
              attachmentStatus: {
                ...item.attachmentStatus,
                ...update,
              } as AttachmentStatus,
            };
          }
          return item;
        })
      );
    },
    []
  );

  const handleResumeUpload = useCallback(
    async (
      file: File,
      retryMessageId?: string,
      overrideConversationId?: string
    ) => {
      const targetConversationId = overrideConversationId || currentConversationId;

      if (!targetConversationId) {
        message.warning('请等待会话初始化完成');
        return;
      }

      const messageId = retryMessageId || `msg-upload-${Date.now()}`;

      // Store file for potential retry
      setFailedFiles((prev) => {
        const next = new Map(prev);
        next.set(messageId, file);
        return next;
      });

      if (!retryMessageId) {
        const initialStatus: AttachmentStatus = {
          fileName: file.name,
          fileSize: file.size,
          uploadProgress: 0,
          parseProgress: 0,
          status: 'uploading',
          mode: 'upload',
        };

        setUploadItems((prev) => [
          ...prev,
          {
            key: messageId,
            role: MessageRole.USER,
            content: `上传简历: ${file.name}`,
            type: 'attachment',
            attachmentStatus: initialStatus,
          },
        ]);
      } else {
        updateAttachmentStatus(
          messageId,
          { status: 'uploading', uploadProgress: 0, error: undefined },
          'upload'
        );
      }

      try {
        // Step 1: Upload
        const uploadPromise = resumeService.uploadResume(
          file,
          undefined,
          (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              updateAttachmentStatus(
                messageId,
                { uploadProgress: Math.min(percentCompleted, 99) },
                'upload'
              );
            }
          }
        );

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('上传超时，请检查网络连接')),
            120000
          )
        );

        const resume = (await Promise.race([
          uploadPromise,
          timeoutPromise,
        ])) as Resume;

        updateAttachmentStatus(
          messageId,
          { uploadProgress: 100, status: 'completed', resumeId: resume.id },
          'upload'
        );

        // Step 2: Parsing
        const parsingMessageId = `msg-ai-parsing-${resume.id}`;
        const parsingStatus: AttachmentStatus = {
          fileName: file.name,
          fileSize: file.size,
          uploadProgress: 100,
          parseProgress: 0,
          status: 'parsing',
          mode: 'parse',
          resumeId: resume.id,
        };

        setUploadItems((prev) => {
          // Check if parsing message already exists
          if (prev.some((item) => item.key === parsingMessageId)) {
            return prev.map((item) =>
              item.key === parsingMessageId
                ? {
                    ...item,
                    attachmentStatus: {
                      ...item.attachmentStatus,
                      status: 'parsing',
                      parseProgress: 0,
                      error: undefined,
                    } as AttachmentStatus,
                  }
                : item
            );
          }
          return [
            ...prev,
            {
              key: parsingMessageId,
              role: MessageRole.ASSISTANT,
              content: '正在解析简历，请稍候...',
              type: 'attachment',
              attachmentStatus: parsingStatus,
            },
          ];
        });

        setFailedFiles((prev) => {
          const next = new Map(prev);
          next.set(parsingMessageId, file);
          return next;
        });

        const parsePromise = resumeService.parseResume(
          resume.id,
          targetConversationId
        );
        const parseTimeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('解析超时，后台正在处理中...')),
            120000
          )
        );

        try {
          const parsedData = (await Promise.race([
            parsePromise,
            parseTimeoutPromise,
          ])) as ParsedResumeData;

          updateAttachmentStatus(
            parsingMessageId,
            { parseProgress: 100, status: 'completed' },
            'parse'
          );

          setFailedFiles((prev) => {
            const next = new Map(prev);
            next.delete(messageId);
            return next;
          });

          // Add success message
          setUploadItems((prev) => [
            ...prev,
            {
              key: `parsing-done-${Date.now()}`,
              role: MessageRole.ASSISTANT,
              content: '简历解析完成，正在为您优化内容...',
              type: 'text',
            },
          ]);

          const resumeMarkdown =
            parsedData?.markdown ||
            parsedData?.extractedText ||
            JSON.stringify(parsedData);
          if (resumeMarkdown && onResumeParsed) {
            onResumeParsed(resume.id, resumeMarkdown, targetConversationId);
          }
        } catch (parseError: any) {
          const isTimeout = parseError.message?.includes('超时');
          updateAttachmentStatus(
            parsingMessageId,
            { status: 'error', error: parseError.message || '解析失败' },
            'parse'
          );

          if (isTimeout) {
            message.warning('解析时间较长，请稍候或重试');
          } else {
            message.error(parseError.message || '解析失败');
          }
        }
      } catch (error: any) {
        updateAttachmentStatus(
          messageId,
          { status: 'error', error: error.message || '上传失败' },
          'upload'
        );
        message.error(error.message || '上传失败');
      }
    },
    [currentConversationId, onResumeParsed, updateAttachmentStatus]
  );

  const removeUploadItem = useCallback((key: string) => {
    setUploadItems((prev) => prev.filter((i) => i.key !== key));
  }, []);

  return {
    uploadItems,
    setUploadItems, // Exposed for external updates (e.g. from WebSocket)
    handleResumeUpload,
    failedFiles,
    removeUploadItem,
    updateAttachmentStatus,
  };
};
