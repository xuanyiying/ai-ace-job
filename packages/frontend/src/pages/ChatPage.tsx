import React, { useState, useEffect } from 'react';
import { UserOutlined, RobotOutlined } from '@ant-design/icons';
import { Bubble, Sender } from '@ant-design/x';
import type { PromptsItemType } from '@ant-design/x';
import {
  FileTextOutlined,
  DownloadOutlined,
  PaperClipOutlined,
} from '@ant-design/icons';
import {
  Sparkles,
  TrendingUp,
  UserCheck,
  Briefcase,
  LayoutGrid,
} from 'lucide-react';
import { Button, message as antMessage, Spin } from 'antd';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTranslation } from 'react-i18next';
import { useConversationStore, useResumeStore } from '../stores';
import ResumeUploadButton from '../components/ResumeUploadButton';
import ResumeComparisonDialog from '../components/ResumeComparisonDialog';
import JobInputDialog from '../components/JobInputDialog';
import JobInfoCard from '../components/JobInfoCard';
import SuggestionsList from '../components/SuggestionsList';
import PDFGenerationCard from '../components/PDFGenerationCard';
import MarkdownPDFCard from '../components/MarkdownPDFCard';
import InterviewQuestionsCard from '../components/InterviewQuestionsCard';
import StreamingMarkdownBubble from '../components/StreamingMarkdownBubble';
import { useChatSocket } from '../hooks/useChatSocket';
import { jobService, type JobInput, type Job } from '../services/job-service';
import {
  MessageRole,
  type InterviewQuestion,
  type Resume,
  type ParsedResumeData,
  type Suggestion,
} from '../types';
import AttachmentMessage, {
  type AttachmentStatus,
} from '../components/AttachmentMessage';
import { resumeService } from '../services/resume-service';
import './chat.css';

interface MessageItem {
  key: string;
  role: MessageRole;
  content: string;
  type?:
    | 'text'
    | 'job'
    | 'suggestions'
    | 'pdf'
    | 'interview'
    | 'markdown-pdf'
    | 'attachment'
    | 'optimization_result';
  jobData?: Job;
  optimizationId?: string;
  optimizedMarkdown?: string;
  suggestions?: Suggestion[];
  interviewQuestions?: InterviewQuestion[];
  attachmentStatus?: AttachmentStatus;
}

const ChatPage: React.FC = () => {
  const { t } = useTranslation();

  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [jobInputDialogVisible, setJobInputDialogVisible] = useState(false);
  const [comparisonVisible, setComparisonVisible] = useState(false);
  const [comparisonData, setComparisonData] = useState<{
    original: string;
    optimized: string;
  }>({ original: '', optimized: '' });
  const [items, setItems] = useState<MessageItem[]>([
    {
      key: 'welcome',
      role: MessageRole.ASSISTANT,
      content: t('chat.welcome'),
      type: 'text',
    },
  ]);

  // Conversation store
  const { currentResume } = useResumeStore();
  const [lastParsedMarkdown, setLastParsedMarkdown] = useState<string>('');

  const {
    currentConversation,
    messages,
    isLoadingMessages,
    createConversation,
    sendMessage,
    loadMessages,
  } = useConversationStore();

  // WebSocket chat hook
  const {
    isConnected,
    isStreaming,
    streamingContent,
    sendMessage: sendSocketMessage,
    notifyResumeParsed,
    joinConversation,
    reset: resetSocket,
  } = useChatSocket({
    onMessage: (msg) => {
      // User message echoed back - already in store
      console.log('Message received:', msg);
    },
    onChunk: (chunk) => {
      // Streaming chunk - handled by streamingContent state
      console.log('Chunk received:', chunk.content?.substring(0, 50));
    },
    onDone: async (msg) => {
      // AI response complete - reload messages to get persisted version
      if (currentConversation) {
        try {
          // Reload messages from database
          await loadMessages(currentConversation.id);

          // Update comparison data if it's an optimization result
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

          // Wait for React to update the UI with new messages before clearing streaming content
          // This ensures smooth transition from streaming to persisted messages
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error) {
          console.error('Failed to load messages:', error);
        } finally {
          // Reset socket state after ensuring messages are loaded and rendered
          resetSocket();
        }
      }
    },
    onError: (err) => {
      antMessage.error(err.content || '处理消息时发生错误');
    },
    onSystem: (sys) => {
      // System messages (file upload notifications, etc.)
      if (sys.metadata?.action === 'resume_ready') {
        antMessage.success('简历已准备就绪，可以开始优化！');
      }

      console.log('System message received:', sys);
      if (sys.metadata?.stage) {
        const { resumeId, stage, progress, error } = sys.metadata;
        // Map backend stages to frontend status
        let status: AttachmentStatus['status'] = 'parsing';
        if (stage === 'finalizing') status = 'completed';
        if (stage === 'error') status = 'error';

        updateAttachmentStatus(
          resumeId,
          {
            parseProgress: progress,
            status: status,
            mode: 'parse',
            error: error,
          },
          'parse'
        );
      }
    },
    onConnected: () => {
      console.log('Chat WebSocket connected');
      // Join current conversation room
      if (currentConversation) {
        joinConversation(currentConversation.id);
      }
    },
  });

  // Initialize conversation on mount
  useEffect(() => {
    const initializeConversation = async () => {
      try {
        // Only create a new conversation if:
        // 1. We don't have a current conversation
        // 2. We are not currently loading messages (which implies we are switching to one)
        // 3. We are not currently creating one
        if (!currentConversation && !isLoadingMessages && !loading) {
          await createConversation();
        }
      } catch (error) {
        console.error('Failed to initialize conversation:', error);
      }
    };
    initializeConversation();
  }, [currentConversation?.id, isLoadingMessages, loading, createConversation]);

  // Join conversation room when conversation changes
  useEffect(() => {
    if (currentConversation && isConnected) {
      joinConversation(currentConversation.id);
    }
  }, [currentConversation?.id, isConnected]);

  // Local items state for items not yet in the message store (like upload progress)
  const [localItems, setLocalItems] = useState<MessageItem[]>([]);

  // Update items when messages change, local items change, or streaming content changes
  useEffect(() => {
    let mappedItems: MessageItem[] = [];

    if (messages.length > 0) {
      mappedItems = messages.map((msg) => {
        let messageType: MessageItem['type'] = 'text';
        if (msg.metadata?.type === 'job') {
          messageType = 'job';
        } else if (msg.metadata?.type === 'suggestions') {
          messageType = 'suggestions';
        } else if (msg.metadata?.type === 'pdf') {
          messageType = 'markdown-pdf';
        } else if (msg.metadata?.type === 'interview') {
          messageType = 'interview';
        } else if (msg.metadata?.type === 'attachment') {
          messageType = 'attachment';
        } else if (msg.metadata?.type === 'optimization_result') {
          messageType = 'optimization_result' as any;
        }

        return {
          key: msg.id,
          role:
            msg.role === MessageRole.ASSISTANT
              ? MessageRole.ASSISTANT
              : MessageRole.USER,
          content: msg.content,
          type: messageType,
          jobData: msg.metadata?.jobData as Job | undefined,
          optimizationId: msg.metadata?.optimizationId as string | undefined,
          optimizedMarkdown: msg.metadata?.optimizedMarkdown as
            | string
            | undefined,
          suggestions: msg.metadata?.suggestions as
            | MessageItem['suggestions']
            | undefined,
          interviewQuestions: msg.metadata?.interviewQuestions as
            | InterviewQuestion[]
            | undefined,
          attachmentStatus: msg.metadata?.attachmentStatus as
            | AttachmentStatus
            | undefined,
        };
      });
    }

    // Filter out local items that have been "promoted" to real messages (by key or content match)
    // However, if the local item has progress info, we want to keep it to show live updates
    const activeLocalItems = localItems.filter((local) => {
      const isPromoted = mappedItems.some((remote) => remote.key === local.key);
      if (!isPromoted) return true;

      // If it is promoted but still has active progress, keep it and we'll handle deduplication below
      return local.attachmentStatus?.status !== 'completed';
    });

    // Create a map for deduplication, prioritizing local items
    const itemMap = new Map<string, MessageItem>();

    // Add welcome message
    const welcomeMsg: MessageItem = {
      key: 'welcome',
      role: MessageRole.ASSISTANT,
      content: t('chat.welcome'),
      type: 'text',
    };
    itemMap.set(welcomeMsg.key, welcomeMsg);

    // Add remote items
    mappedItems.forEach((item) => {
      itemMap.set(item.key, item);
    });

    // Add/Overwrite with local items (prioritizing live progress)
    activeLocalItems.forEach((item) => {
      itemMap.set(item.key, item);
    });

    const displayItems: MessageItem[] = Array.from(itemMap.values());

    if (isStreaming && streamingContent) {
      // Avoid duplication during transition from streaming to persisted
      // If the last persisted message is from assistant and contains the streaming content,
      // we don't need to show the streaming bubble anymore.
      const lastPersistedAssistantMessage = [...mappedItems]
        .reverse()
        .find((m) => m.role === MessageRole.ASSISTANT);

      const isAlreadyPersisted =
        lastPersistedAssistantMessage &&
        (lastPersistedAssistantMessage.content.includes(streamingContent) ||
          (lastPersistedAssistantMessage.type === 'optimization_result' &&
            lastPersistedAssistantMessage.content.length > 0));

      if (!isAlreadyPersisted) {
        // Detect sections and add tips
        const sections = [
          {
            key: '基本信息',
            tip: '✅ 已优化基本信息，增强了个人联系方式的排版',
          },
          { key: '专业总结', tip: '✅ 已优化专业总结，提升了核心竞争力的表达' },
          {
            key: '工作经历',
            tip: '✅ 已优化工作经历，强化了量化成果和技术关键词',
          },
          { key: '教育背景', tip: '✅ 已优化教育背景，整理了学术成就和荣誉' },
          {
            key: '项目经验',
            tip: '✅ 已优化项目经验，突出了个人在项目中的核心贡献',
          },
          {
            key: '技能列表',
            tip: '✅ 已优化技能列表，按专业类别进行了结构化分类',
          },
        ];

        let displayContent = streamingContent;
        const activeTips: string[] = [];

        sections.forEach((section) => {
          if (streamingContent.includes(section.key)) {
            activeTips.push(section.tip);
          }
        });

        if (activeTips.length > 0) {
          displayContent += '\n\n---\n' + activeTips.join('\n');
        }

        displayItems.push({
          key: 'streaming-optimization',
          role: MessageRole.ASSISTANT,
          content: displayContent,
          type: 'text',
        });
      }
    }

    setItems(displayItems);
  }, [messages, localItems, streamingContent, isStreaming, t]);

  const handleFileSelect = async (file: File) => {
    if (!currentConversation) return;

    const initialStatus: AttachmentStatus = {
      fileName: file.name,
      fileSize: file.size,
      uploadProgress: 0,
      parseProgress: 0,
      status: 'uploading',
      mode: 'upload',
    };

    // Step 1: Uploading - Send persistent message to conversation
    let userMessage: any;
    try {
      userMessage = await sendMessage(
        currentConversation.id,
        `上传简历: ${file.name}`,
        MessageRole.USER,
        {
          type: 'attachment',
          attachmentStatus: initialStatus,
        }
      );
    } catch (sendError) {
      console.error('Failed to send upload start message:', sendError);
      // Fallback to local item if send fails
    }

    const messageId = userMessage?.id || `msg-user-${Date.now()}`;

    setLocalItems((prev) => [
      ...prev,
      {
        key: messageId,
        role: MessageRole.USER,
        content: `上传简历: ${file.name}`,
        type: 'attachment',
        attachmentStatus: initialStatus,
      },
    ]);

    try {
      // Step 1: Uploading progress
      let uploadProgress = 0;
      const uploadInterval = setInterval(() => {
        uploadProgress += 10;
        updateAttachmentStatus(
          messageId,
          {
            uploadProgress: Math.min(uploadProgress, 90),
          },
          'upload'
        );
        if (uploadProgress >= 90) clearInterval(uploadInterval);
      }, 200);

      const resume = await resumeService.uploadResume(file);
      clearInterval(uploadInterval);

      updateAttachmentStatus(
        messageId,
        {
          uploadProgress: 100,
          status: 'completed',
        },
        'upload'
      );

      // Step 2: Parsing (AI Message for Parsing) - Send persistent message
      const parsingStatus: AttachmentStatus = {
        fileName: file.name,
        fileSize: file.size,
        uploadProgress: 100,
        parseProgress: 0,
        status: 'parsing',
        mode: 'parse',
      };

      let parsingMessage: any;
      try {
        parsingMessage = await sendMessage(
          currentConversation.id,
          '正在解析简历，请稍候...',
          MessageRole.ASSISTANT,
          {
            type: 'attachment',
            attachmentStatus: parsingStatus,
          }
        );
      } catch (sendError) {
        console.error('Failed to send parsing start message:', sendError);
      }

      const parsingMessageId =
        parsingMessage?.id || `msg-ai-parsing-${Date.now()}`;

      setLocalItems((prev) => [
        ...prev,
        {
          key: parsingMessageId,
          role: MessageRole.ASSISTANT,
          content: '正在解析简历，请稍候...',
          type: 'attachment',
          attachmentStatus: parsingStatus,
        },
      ]);

      // Real parsing progress will be handled by onSystem events from WebSocket
      const parsedData = await resumeService.parseResume(
        resume.id,
        currentConversation.id
      );

      updateAttachmentStatus(
        parsingMessageId,
        {
          parseProgress: 100,
          status: 'completed',
        },
        'parse'
      );

      // Add a success message after parsing
      setLocalItems((prev) => [
        ...prev,
        {
          key: `parsing-done-${Date.now()}`,
          role: MessageRole.ASSISTANT,
          content: '简历解析完成，正在为您优化内容...',
          type: 'text',
        },
      ]);

      // After successful parse, trigger optimization via WebSocket
      const resumeMarkdown =
        parsedData?.markdown ||
        parsedData?.extractedText ||
        JSON.stringify(parsedData);

      if (resumeMarkdown) {
        setComparisonData((prev) => ({
          ...prev,
          original: resumeMarkdown,
        }));

        // Notify WebSocket about parsed resume and trigger optimization
        if (currentConversation) {
          notifyResumeParsed(currentConversation.id, resume.id, resumeMarkdown);
          // Send optimization request
          sendSocketMessage(currentConversation.id, '优化简历', {
            action: 'optimize_resume',
            resumeId: resume.id,
          });
        }
      }

      // Handle success for resume store
      handleResumeUploadSuccess({ resume, parsedData });
    } catch (error) {
      console.error('File upload/parse error:', error);
      const errorId = messageId || `msg-error-${Date.now()}`;
      updateAttachmentStatus(errorId, {
        status: 'error',
        error: error instanceof Error ? error.message : '上传或解析失败',
      });
      antMessage.error('上传或解析失败，请重试');
    }
  };

  const updateAttachmentStatus = (
    key: string,
    update: Partial<AttachmentStatus>,
    mode?: 'upload' | 'parse'
  ) => {
    setLocalItems((prev) =>
      prev.map((item) => {
        if (
          item.type === 'attachment' &&
          (item.key === key || item.attachmentStatus?.fileName === key) &&
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
  };

  const handleSubmit = async (nextValue: string) => {
    if (!nextValue || !currentConversation) return;

    try {
      setValue('');
      setLoading(true);

      // Send message via WebSocket - backend will handle intent recognition
      sendSocketMessage(currentConversation.id, nextValue, {
        hasResume: !!lastParsedMarkdown || !!comparisonData.original,
      });

      setLoading(false);
    } catch (error) {
      console.error('Failed to send message:', error);
      antMessage.error(t('common.error'));
      setLoading(false);
    }
  };

  const handleDownloadOptimized = async () => {
    if (!comparisonData.optimized) return;

    try {
      // Create a message for PDF generation
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

      antMessage.success(t('chat.pdf_generation_started', '已启动 PDF 生成'));
    } catch (error) {
      antMessage.error(t('chat.download_failed', '下载失败'));
    }
  };

  const handleOpenComparison = () => {
    setComparisonVisible(true);
  };

  const handleStartOptimization = async () => {
    if (!currentConversation) return;

    if (!currentResume && !lastParsedMarkdown) {
      antMessage.warning(
        t('chat.upload_resume_first', 'Please upload a resume first')
      );
      return;
    }

    try {
      setLoading(true);
      // Send optimization request via WebSocket
      sendSocketMessage(currentConversation.id, '优化简历', {
        action: 'optimize_resume',
      });
    } catch (error) {
      console.error('Failed to start optimization:', error);
      antMessage.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleResumeUploadSuccess = async (data: unknown): Promise<void> => {
    const uploadData = data as { resume: Resume; parsedData: ParsedResumeData };
    if (!currentConversation) return;

    try {
      const parsedData = uploadData?.parsedData;
      if (parsedData?.markdown) {
        setLastParsedMarkdown(parsedData.markdown);
        setComparisonData((prev) => ({
          ...prev,
          original: parsedData.markdown || prev.original,
        }));

        // Notify WebSocket about parsed resume
        notifyResumeParsed(
          currentConversation.id,
          uploadData.resume.id,
          parsedData.markdown
        );
      }
    } catch (error) {
      console.error('Failed to handle resume upload success:', error);
    }
  };

  const handleJobCreated = async (jobData: JobInput) => {
    if (!currentConversation) return;

    try {
      setLoading(true);

      // Create job in backend
      const createdJob = await jobService.createJob(jobData);

      // Add job confirmation message
      await sendMessage(
        currentConversation.id,
        t('chat.job_saved_success', {
          title: createdJob.title,
          company: createdJob.company,
        }),
        MessageRole.ASSISTANT
      );

      // Add job info card message with metadata
      await sendMessage(
        currentConversation.id,
        t('chat.job_extracted_title'),
        MessageRole.ASSISTANT,
        {
          type: 'job',
          jobData: createdJob,
        }
      );

      setJobInputDialogVisible(false);
      antMessage.success(t('chat.job_confirmed'));
    } catch (error) {
      console.error('Failed to create job:', error);
      antMessage.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleJobConfirm = (job: Job) => {
    antMessage.success(t('chat.job_confirmed'));
    // Start optimization automatically if resume exists
    if (currentResume || lastParsedMarkdown) {
      handleStartOptimization();
    } else {
      antMessage.info('职位信息已确认，请上传简历以开始优化。');
    }
  };

  const handleJobEdit = (updatedJob: Job) => {
    // Refresh messages or local items to show updated job data
    // The card itself handles local state for editing, but we might want to update the store
    if (currentConversation) {
      loadMessages(currentConversation.id);
    }
  };

  const handleJobDelete = (jobId: string) => {
    // Remove from localItems if it's there
    setLocalItems((prev) => prev.filter((item) => item.jobData?.id !== jobId));
    // If it's a real message, we'd need to reload
    if (currentConversation) {
      loadMessages(currentConversation.id);
    }
  };

  const displayPDFGeneration = async (optimizationId: string) => {
    if (!currentConversation) return;

    try {
      // Add PDF generation message with metadata
      await sendMessage(
        currentConversation.id,
        t('chat.pdf_ready'),
        MessageRole.ASSISTANT,
        {
          type: 'pdf',
          optimizationId,
        }
      );
    } catch (error) {
      console.error('Failed to display PDF generation:', error);
      antMessage.error(t('common.error'));
    }
  };

  const handleAcceptSuggestion = async (suggestionId: string) => {
    try {
      // This is a placeholder for future implementation with real backend
      console.log('Accepting suggestion:', suggestionId);
      antMessage.success(t('chat.suggestion_accepted', 'Suggestion accepted!'));
    } catch (error) {
      antMessage.error(t('common.error'));
    }
  };

  const handleRejectSuggestion = async (suggestionId: string) => {
    try {
      console.log('Rejecting suggestion:', suggestionId);
    } catch (error) {
      antMessage.error(t('common.error'));
    }
  };

  const welcomeActions = [
    {
      icon: <Briefcase size={20} />,
      label: t('chat.actions.job_input', '职位输入'),
      key: 'job_input',
    },
    {
      icon: <Sparkles size={20} />,
      label: t('chat.actions.resume_optimization', '简历优化'),
      key: 'resume_optimization',
    },
    {
      icon: <TrendingUp size={20} />,
      label: t('chat.actions.interview_prediction', '面试预测'),
      key: 'interview_prediction',
    },
    {
      icon: <UserCheck size={20} />,
      label: t('chat.actions.mock_interview', '模拟面试'),
      key: 'mock_interview',
    },
    {
      icon: <LayoutGrid size={20} />,
      label: t('chat.actions.discover', '发现'),
      key: 'discover',
    },
  ];

  const handleActionClick = (action: (typeof welcomeActions)[0]) => {
    if (action.key === 'job_input') {
      setJobInputDialogVisible(true);
    } else if (action.key === 'resume_optimization') {
      if (currentResume || lastParsedMarkdown) {
        handleStartOptimization();
      } else {
        antMessage.info('请先点击输入框左侧图标上传简历，再进行优化。');
      }
    } else if (action.key === 'interview_prediction') {
      if (currentResume || lastParsedMarkdown) {
        handleSubmit('面试预测');
      } else {
        antMessage.info('请先点击输入框左侧图标上传简历，以便我为您进行更准确的面试预测。');
      }
    } else if (action.key === 'mock_interview') {
      handleSubmit('开始模拟面试');
    } else {
      handleSubmit(action.label);
    }
  };

  return (
    <div className="chat-page-container flex h-full w-full relative overflow-hidden">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full relative z-10">
        {/* Messages Container */}
        <div className="flex-1 overflow-auto p-4 md:p-6" id="scrollableDiv">
          {isLoadingMessages ? (
            <div className="flex items-center justify-center h-full">
              <Spin size="large" tip={t('common.loading')} />
            </div>
          ) : items.length <= 1 && !loading ? (
            <div className="welcome-container">
              <h1 className="welcome-title">你好，我是简历优化助手</h1>
              
              <div className="w-full max-w-3xl mx-auto px-4">
                <div className="modern-sender-wrapper">
                  <Sender
                    value={value}
                    onChange={setValue}
                    onSubmit={handleSubmit}
                    loading={loading}
                    placeholder={t('chat.placeholder', '向助手提问...')}
                    prefix={
                      <ResumeUploadButton
                        onFileSelect={handleFileSelect}
                        className="!border-none !bg-transparent !text-gray-400 hover:!text-primary !p-0 !flex !items-center !justify-center"
                      >
                        <PaperClipOutlined style={{ fontSize: '20px' }} />
                      </ResumeUploadButton>
                    }
                    className="modern-sender"
                  />
                </div>

                <div className="quick-launch-grid">
                  {welcomeActions.map((action) => (
                    <div
                      key={action.key}
                      className="quick-launch-item"
                      onClick={() => handleActionClick(action)}
                    >
                      <div className="quick-launch-icon">{action.icon}</div>
                      <span className="quick-launch-label">{action.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              <Bubble.List
                items={items.map((item) => ({
                  key: item.key,
                  role: item.role,
                  placement: item.role === MessageRole.USER ? 'end' : 'start',
                  content: (
                    <div className="markdown-content">
                      {item.key === 'streaming-optimization' ? (
                        <StreamingMarkdownBubble
                          content={item.content}
                          isStreaming={isStreaming}
                        />
                      ) : (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {item.content}
                        </ReactMarkdown>
                      )}

                      {item.type === 'attachment' && item.attachmentStatus && (
                        <AttachmentMessage
                          status={item.attachmentStatus}
                          onDelete={() => {
                            setLocalItems((prev) =>
                              prev.filter((i) => i.key !== item.key)
                            );
                          }}
                        />
                      )}

                      {item.type === 'optimization_result' && (
                        <div className="mt-4 flex gap-2">
                          <Button
                            type="primary"
                            icon={<FileTextOutlined />}
                            onClick={handleOpenComparison}
                          >
                            查看对比
                          </Button>
                          <Button
                            icon={<DownloadOutlined />}
                            onClick={handleDownloadOptimized}
                          >
                            下载简历
                          </Button>
                        </div>
                      )}

                      {item.type === 'job' && item.jobData && (
                        <div className="mt-4">
                          <JobInfoCard
                            job={item.jobData}
                            onConfirm={handleJobConfirm}
                            onEdit={handleJobEdit}
                            onDelete={handleJobDelete}
                          />
                        </div>
                      )}

                      {item.type === 'suggestions' && item.suggestions && (
                        <div className="mt-4">
                          <SuggestionsList
                            suggestions={item.suggestions}
                            onAccept={handleAcceptSuggestion}
                            onReject={handleRejectSuggestion}
                          />
                        </div>
                      )}

                      {item.type === 'pdf' && item.optimizationId && (
                        <div className="mt-4">
                          <PDFGenerationCard
                            optimizationId={item.optimizationId}
                          />
                        </div>
                      )}

                      {item.type === 'markdown-pdf' &&
                        item.optimizedMarkdown && (
                          <div className="mt-4">
                            <MarkdownPDFCard
                              markdown={item.optimizedMarkdown}
                            />
                          </div>
                        )}

                      {item.type === 'interview' && item.interviewQuestions && (
                        <div className="mt-4">
                          <InterviewQuestionsCard
                            questions={item.interviewQuestions}
                            optimizationId={item.optimizationId || 'default'}
                          />
                        </div>
                      )}
                    </div>
                  ),
                  avatar:
                    item.role === MessageRole.USER ? (
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'var(--chat-bubble-user-bg)',
                        }}
                      >
                        <UserOutlined
                          style={{
                            color: 'var(--chat-text-secondary)',
                            fontSize: '18px',
                          }}
                        />
                      </div>
                    ) : (
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(22, 119, 255, 0.1)',
                        }}
                      >
                        <RobotOutlined
                          style={{
                            color: 'var(--chat-primary)',
                            fontSize: '18px',
                          }}
                        />
                      </div>
                    ),
                }))}
              />
            </>
          )}
        </div>

        {/* Input Area (Only shown when there are messages) */}
        {items.length > 1 && (
          <div className="relative z-20 pb-8 px-4 md:px-6">
            <div className="max-w-3xl mx-auto">
              <Sender
                value={value}
                onChange={setValue}
                onSubmit={handleSubmit}
                loading={loading}
                placeholder={t('chat.placeholder')}
                prefix={
                  <ResumeUploadButton
                    onFileSelect={handleFileSelect}
                    className="!border-none !bg-transparent !text-gray-400 hover:!text-primary !p-0 !flex !items-center !justify-center"
                  >
                    <PaperClipOutlined style={{ fontSize: '20px' }} />
                  </ResumeUploadButton>
                }
                className="modern-sender shadow-2xl"
              />

              <div className="text-center mt-3 text-gray-500 text-xs tracking-wide">
                {t('chat.ai_disclaimer')}
              </div>
            </div>
          </div>
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
        onClose={() => setJobInputDialogVisible(false)}
        onJobCreated={handleJobCreated}
      />
    </div>
  );
};

export default ChatPage;
