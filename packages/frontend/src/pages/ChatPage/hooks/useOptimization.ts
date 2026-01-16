import { useState, useCallback } from 'react';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';
import { optimizationService } from '../../../services/optimization-service';
import { useConversationStore } from '../../../stores';
import { MessageRole, type MessageItem } from '../../../types';

interface UseOptimizationProps {
  sendSocketMessage: (
    conversationId: string,
    content: string,
    metadata?: any
  ) => void;
  setLocalItems: React.Dispatch<React.SetStateAction<MessageItem[]>>;
}

export const useOptimization = ({
  sendSocketMessage,
  setLocalItems,
}: UseOptimizationProps) => {
  const { t } = useTranslation();
  const { currentConversation, loadMessages, messages } =
    useConversationStore();

  const [comparisonVisible, setComparisonVisible] = useState(false);
  const [comparisonData, setComparisonData] = useState<{
    original: string;
    optimized: string;
  }>({ original: '', optimized: '' });
  const [isOptimizationLoading, setIsOptimizationLoading] = useState(false);

  const handleAcceptSuggestion = useCallback(
    async (suggestionId: string, optimizationId?: string) => {
      if (!optimizationId) {
        message.warning('无法找到优化记录 ID');
        return;
      }
      try {
        await optimizationService.acceptSuggestion(
          optimizationId,
          suggestionId
        );
        message.success(t('chat.suggestion_accepted', '建议已接受'));
        if (currentConversation) {
          await loadMessages(currentConversation.id);
        }
      } catch (error) {
        console.error('Failed to accept suggestion:', error);
        message.error(t('common.error'));
      }
    },
    [currentConversation, loadMessages, t]
  );

  const handleRejectSuggestion = useCallback(
    async (suggestionId: string, optimizationId?: string) => {
      if (!optimizationId) {
        message.warning('无法找到优化记录 ID');
        return;
      }
      try {
        await optimizationService.rejectSuggestion(
          optimizationId,
          suggestionId
        );
        message.success(t('chat.suggestion_rejected', '建议已拒绝'));
        if (currentConversation) {
          await loadMessages(currentConversation.id);
        }
      } catch (error) {
        console.error('Failed to reject suggestion:', error);
        message.error(t('common.error'));
      }
    },
    [currentConversation, loadMessages, t]
  );

  const handleAcceptAllSuggestions = useCallback(
    async (optimizationId?: string) => {
      if (!optimizationId) {
        message.warning('无法找到优化记录 ID');
        return;
      }
      try {
        const messageItem = messages.find(
          (m) => m.metadata?.optimizationId === optimizationId
        );
        const suggestions = messageItem?.metadata?.suggestions as any[];

        if (!suggestions || suggestions.length === 0) return;

        const pendingIds = suggestions
          .filter((s) => s.status === 'pending')
          .map((s) => s.id);

        if (pendingIds.length === 0) return;

        await optimizationService.acceptBatchSuggestions(
          optimizationId,
          pendingIds
        );
        message.success(t('chat.all_suggestions_accepted', '所有建议已接受'));
        if (currentConversation) {
          await loadMessages(currentConversation.id);
        }
      } catch (error) {
        console.error('Failed to accept all suggestions:', error);
        message.error(t('common.error'));
      }
    },
    [messages, currentConversation, loadMessages, t]
  );

  const handleDownloadOptimized = useCallback(async () => {
    if (!comparisonData.optimized) return;

    try {
      const pdfMsgId = `pdf-gen-${Date.now()}`;
      setLocalItems((prev) => [
        ...prev,
        {
          key: pdfMsgId,
          role: MessageRole.ASSISTANT,
          content: '正在为您生成 PDF 格式的优化简历...',
          type: 'markdown-pdf',
          optimizedMarkdown: comparisonData.optimized,
        },
      ]);

      message.success(t('chat.pdf_generation_started', '已启动 PDF 生成'));
    } catch (error) {
      message.error(t('chat.download_failed', '下载失败'));
    }
  }, [comparisonData.optimized, setLocalItems, t]);

  const handleStartOptimization = useCallback(
    async (hasResume: boolean, overrideConversationId?: string) => {
      const targetId = overrideConversationId || currentConversation?.id;

      if (!targetId) return;

      if (!hasResume) {
        message.warning(
          t('chat.upload_resume_first', 'Please upload a resume first')
        );
        return;
      }

      try {
        setIsOptimizationLoading(true);
        sendSocketMessage(targetId, '优化简历', {
          action: 'optimize_resume',
        });
      } catch (error) {
        console.error('Failed to start optimization:', error);
        message.error(t('common.error'));
      } finally {
        setIsOptimizationLoading(false);
      }
    },
    [currentConversation, sendSocketMessage, t]
  );

  return {
    comparisonVisible,
    setComparisonVisible,
    comparisonData,
    setComparisonData,
    isOptimizationLoading,
    handleAcceptSuggestion,
    handleRejectSuggestion,
    handleAcceptAllSuggestions,
    handleDownloadOptimized,
    handleStartOptimization,
  };
};
