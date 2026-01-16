import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';
import { useConversationStore, useResumeStore } from '../../stores';
import { useChatSocket } from '../../hooks/useChatSocket';
import { AttachmentStatus } from '../../types';

// Components
import { ChatWelcome } from './components/ChatWelcome';
import { ChatList } from './components/ChatList';
import { ChatInput } from './components/ChatInput';
import ResumeComparisonDialog from '../../components/ResumeComparisonDialog';
import JobInputDialog from '../../components/JobInputDialog';

// Hooks
import { useResumeUpload } from './hooks/useResumeUpload';
import { useJobActions } from './hooks/useJobActions';
import { useOptimization } from './hooks/useOptimization';
import { useChatItems } from './hooks/useChatItems';

import './chat.css';

const ChatPage: React.FC = () => {
  const { t } = useTranslation();
  const { id: conversationId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Local State
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Global Stores
  const { currentResume } = useResumeStore();
  const {
    currentConversation,
    messages,
    isLoadingMessages,
    messageError,
    loadMessages,
    loadMoreMessages,
    createConversation,
    setCurrentConversation,
    hasMoreMessages,
  } = useConversationStore();

  // Custom Hooks
  // 1. Resume Upload & Parsing
  const {
    uploadItems,
    handleResumeUpload,
    updateAttachmentStatus,
    setUploadItems, // Exposed for socket updates
    removeUploadItem,
    failedFiles,
  } = useResumeUpload({
    currentConversationId: currentConversation?.id,
    onResumeParsed: (resumeId, markdown, conversationId) => {
      const targetId = conversationId || currentConversation?.id;
      // Notify socket about parsed resume
      if (targetId) {
        notifyResumeParsed(targetId, resumeId, markdown);
        sendSocketMessage(targetId, '优化简历', {
          action: 'optimize_resume',
          resumeId: resumeId,
        });
      }
      // Also update comparison data
      setComparisonData((prev) => ({ ...prev, original: markdown }));
    },
  });

  // 2. WebSocket
  const {
    isConnected,
    isStreaming,
    streamingContent,
    sendMessage: sendSocketMessage,
    notifyResumeParsed,
    joinConversation,
    reset: resetSocket,
  } = useChatSocket({
    onMessage: (msg) => console.log('Message received:', msg),
    onChunk: (chunk) =>
      console.log('Chunk received:', chunk.content?.substring(0, 50)),
    onDone: async (msg) => {
      if (currentConversation) {
        try {
          await loadMessages(currentConversation.id);
          if (
            msg.metadata?.type === 'optimization_result' &&
            msg.metadata?.optimizedContent
          ) {
            setComparisonData((prev) => ({
              ...prev,
              optimized:
                (msg.metadata?.optimizedContent as string) || prev.optimized,
            }));
          }
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error) {
          console.error('Failed to load messages:', error);
        } finally {
          resetSocket();
        }
      }
    },
    onError: (err) => message.error(err.content || '处理消息时发生错误'),
    onSystem: (sys) => {
      if (sys.metadata?.action === 'resume_ready') {
        message.success('简历已准备就绪，可以开始优化！');
      }
      if (sys.metadata?.stage) {
        const { resumeId, stage, progress, error } = sys.metadata;
        let status: AttachmentStatus['status'] = 'parsing';
        let finalProgress = progress;

        if (stage === 'finalizing') {
          status = 'completed';
          finalProgress = 100;
        }
        if (stage === 'error') {
          status = 'error';
        }

        updateAttachmentStatus(
          resumeId,
          {
            parseProgress: finalProgress,
            status: status,
            mode: 'parse',
            error: error,
          },
          'parse'
        );
      }
    },
    onConnected: () => {
      if (currentConversation) {
        joinConversation(currentConversation.id);
      }
    },
  });

  // 3. Optimization Logic
  const {
    comparisonVisible,
    setComparisonVisible,
    comparisonData,
    setComparisonData,
    handleAcceptSuggestion,
    handleRejectSuggestion,
    handleAcceptAllSuggestions,
    handleDownloadOptimized,
    handleStartOptimization,
  } = useOptimization({
    sendSocketMessage,
    setLocalItems: setUploadItems, // Reuse upload items for PDF gen status which is similar
  });

  // 4. Job Actions
  const {
    jobInputDialogVisible,
    setJobInputDialogVisible,
    editingJob,
    setEditingJob,
    handleJobCreated,
    handleJobConfirm,
    handleJobEdit,
    handleJobUpdated,
    handleJobDelete,
  } = useJobActions(() =>
    handleStartOptimization(!!(currentResume || comparisonData.original))
  );

  // 5. Chat Items Aggregation
  const items = useChatItems({
    messages,
    localItems: uploadItems,
    streamingContent,
    isStreaming,
  });

  // Initialization Effects
  useEffect(() => {
    const init = async () => {
      if (conversationId) {
        if (currentConversation?.id !== conversationId) {
          setCurrentConversation({ id: conversationId } as any);
          await loadMessages(conversationId);
        }
        return;
      }
    };
    init();
  }, [
    conversationId,
    currentConversation?.id,
    loadMessages,
    setCurrentConversation,
  ]);

  useEffect(() => {
    if (currentConversation && isConnected) {
      joinConversation(currentConversation.id);
    }
  }, [currentConversation?.id, isConnected, joinConversation]);

  // Handlers
  const handleSubmit = async (nextValue: string) => {
    if (!nextValue) return;

    let targetId = currentConversation?.id;
    if (!targetId) {
      try {
        const newConvo = await createConversation();
        targetId = newConvo.id;
      } catch (error) {
        console.error('Failed to create conversation:', error);
        message.error(t('common.error'));
        return;
      }
    }

    try {
      setValue('');
      setLoading(true);
      sendSocketMessage(targetId, nextValue, {
        hasResume: !!comparisonData.original,
      });
      setLoading(false);
    } catch (error) {
      console.error('Failed to send message:', error);
      message.error(t('common.error'));
      setLoading(false);
    }
  };

  const handleRetryLoadMessages = async () => {
    if (currentConversation) {
      try {
        await loadMessages(currentConversation.id);
        setRetryCount(0);
      } catch (error) {
        if (retryCount < 3) {
          setRetryCount((prev) => prev + 1);
          setTimeout(handleRetryLoadMessages, 2000);
        }
      }
    }
  };

  const handleFileUploadWrapper = async (file: File) => {
    let targetId = currentConversation?.id;
    if (!targetId) {
      try {
        const newConvo = await createConversation();
        targetId = newConvo.id;
      } catch (error) {
        console.error('Failed to create conversation:', error);
        message.error(t('common.error'));
        return;
      }
    }
    if (targetId) {
      await handleResumeUpload(file, undefined, targetId);
    }
  };

  const handleActionClick = async (key: string, label: string) => {
    if (key === 'job_input') {
      setJobInputDialogVisible(true);
    } else if (key === 'resume_optimization') {
      let targetId = currentConversation?.id;
      if (!targetId && (currentResume || comparisonData.original)) {
        try {
          const newConvo = await createConversation();
          targetId = newConvo.id;
        } catch (error) {
          console.error('Failed to create conversation:', error);
          return;
        }
      }
      handleStartOptimization(
        !!(currentResume || comparisonData.original),
        targetId
      );
    } else if (key === 'interview_prediction') {
      navigate('/agents/interview-prediction');
    } else if (key === 'mock_interview') {
      navigate('/agents/mock-interview');
    } else {
      handleSubmit(label);
    }
  };

  const handleLoadMore = async () => {
    if (currentConversation && hasMoreMessages && !isLoadingMessages) {
      await loadMoreMessages(currentConversation.id);
    }
  };

  return (
    <div className="chat-page-container flex h-full w-full relative overflow-hidden">
      <div className="flex-1 flex flex-col h-full relative z-10">
        {items.length <= 1 && !loading && !isLoadingMessages ? (
          <ChatWelcome
            value={value}
            onChange={setValue}
            onSubmit={handleSubmit}
            loading={loading}
            onFileSelect={handleFileUploadWrapper}
            onActionClick={handleActionClick}
          />
        ) : (
          <>
            <ChatList
              items={items}
              isLoading={isLoadingMessages}
              messageError={messageError}
              hasMoreMessages={hasMoreMessages}
              isStreaming={isStreaming}
              onLoadMore={handleLoadMore}
              onRetryLoad={handleRetryLoadMessages}
              contentHandlers={{
                onDeleteAttachment: removeUploadItem,
                onRetryAttachment: (key) => {
                  const file = failedFiles.get(key);
                  if (file) handleResumeUpload(file, key);
                  else message.info('无法获取原始文件，请重新上传');
                },
                onOpenComparison: () => setComparisonVisible(true),
                onDownloadOptimized: handleDownloadOptimized,
                onConfirmJob: handleJobConfirm,
                onEditJob: handleJobEdit,
                onDeleteJob: handleJobDelete,
                onAcceptSuggestion: handleAcceptSuggestion,
                onRejectSuggestion: handleRejectSuggestion,
                onAcceptAllSuggestions: handleAcceptAllSuggestions,
              }}
            />
            <ChatInput
              value={value}
              onChange={setValue}
              onSubmit={handleSubmit}
              loading={loading}
              onFileSelect={handleResumeUpload}
            />
          </>
        )}
      </div>

      <ResumeComparisonDialog
        visible={comparisonVisible}
        onClose={() => setComparisonVisible(false)}
        originalContent={comparisonData.original}
        optimizedContent={comparisonData.optimized}
        onDownload={handleDownloadOptimized}
      />

      <JobInputDialog
        visible={jobInputDialogVisible}
        onClose={() => {
          setJobInputDialogVisible(false);
          setEditingJob(null);
        }}
        onJobCreated={handleJobCreated}
        onJobUpdated={handleJobUpdated}
        initialData={editingJob}
      />
    </div>
  );
};

export default ChatPage;
