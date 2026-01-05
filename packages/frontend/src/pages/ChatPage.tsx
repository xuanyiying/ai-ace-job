import React, { useState, useEffect } from 'react';
import { Bubble, Sender, Prompts } from '@ant-design/x';
import type { PromptsItemType } from '@ant-design/x';
import {
  CloudUploadOutlined,
  UserOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import { theme, Upload, Button, message as antMessage } from 'antd';
import type { UploadProps } from 'antd';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTranslation } from 'react-i18next';
import { useConversationStore } from '../stores';
import ResumeUploadDialog from '../components/ResumeUploadDialog';
import JobInputDialog from '../components/JobInputDialog';
import JobInfoCard from '../components/JobInfoCard';
import SuggestionsList from '../components/SuggestionsList';
import PDFGenerationCard from '../components/PDFGenerationCard';
import InterviewQuestionsCard from '../components/InterviewQuestionsCard';
import { jobService, type JobInput, type Job } from '../services/jobService';
import { optimizationService } from '../services/optimizationService';
import type { InterviewQuestion, Resume, ParsedResumeData } from '../types';
import './chat.css';

interface MessageItem {
  key: string;
  role: 'user' | 'ai';
  content: string;
  type?: 'text' | 'job' | 'suggestions' | 'pdf' | 'interview';
  jobData?: Job;
  optimizationId?: string;
  suggestions?: Array<{
    id: string;
    type: 'content' | 'keyword' | 'structure' | 'quantification';
    section: string;
    itemIndex?: number;
    original: string;
    optimized: string;
    reason: string;
    status: 'pending' | 'accepted' | 'rejected';
  }>;
  interviewQuestions?: InterviewQuestion[];
}

const ChatPage: React.FC = () => {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadDialogVisible, setUploadDialogVisible] = useState(false);
  const [jobInputDialogVisible, setJobInputDialogVisible] = useState(false);
  const [items, setItems] = useState<MessageItem[]>([
    {
      key: 'welcome',
      role: 'ai',
      content: t('chat.welcome'),
      type: 'text',
    },
  ]);

  // Conversation store
  const { currentConversation, messages, createConversation, sendMessage } =
    useConversationStore();

  // Initialize conversation on mount
  useEffect(() => {
    const initializeConversation = async () => {
      try {
        if (!currentConversation) {
          await createConversation();
        }
      } catch (error) {
        console.error('Failed to initialize conversation:', error);
      }
    };
    initializeConversation();
  }, []);

  // Update items when messages change
  useEffect(() => {
    if (messages.length > 0) {
      const mappedItems: MessageItem[] = messages.map((msg) => {
        let messageType: MessageItem['type'] = 'text';
        if (msg.metadata?.type === 'job') {
          messageType = 'job';
        } else if (msg.metadata?.type === 'suggestions') {
          messageType = 'suggestions';
        } else if (msg.metadata?.type === 'pdf') {
          messageType = 'pdf';
        } else if (msg.metadata?.type === 'interview') {
          messageType = 'interview';
        }

        return {
          key: msg.id,
          role: msg.role === 'assistant' ? 'ai' : 'user',
          content: msg.content,
          type: messageType,
          jobData: msg.metadata?.jobData as Job | undefined,
          optimizationId: msg.metadata?.optimizationId as string | undefined,
          suggestions: msg.metadata?.suggestions as
            | MessageItem['suggestions']
            | undefined,
          interviewQuestions: msg.metadata?.interviewQuestions as
            | InterviewQuestion[]
            | undefined,
        };
      });
      setItems([
        {
          key: 'welcome',
          role: 'ai',
          content: t('chat.welcome'),
          type: 'text',
        },
        ...mappedItems,
      ]);
    }
  }, [messages, t]);

  const suggestions: PromptsItemType[] = [
    {
      key: 'resume',
      label: t('suggestions.resume_label'),
      description: t('suggestions.resume_desc'),
      icon: <span style={{ fontSize: '16px' }}>📄</span>,
    },
    {
      key: 'job',
      label: t('suggestions.job_label'),
      description: t('suggestions.job_desc'),
      icon: <span style={{ fontSize: '16px' }}>💼</span>,
    },
    {
      key: 'pdf',
      label: t('suggestions.pdf_label'),
      description: t('suggestions.pdf_desc'),
      icon: <span style={{ fontSize: '16px' }}>📋</span>,
    },
    {
      key: 'interview',
      label: t('suggestions.interview_label'),
      description: t('suggestions.interview_desc'),
      icon: <span style={{ fontSize: '16px' }}>🎤</span>,
    },
  ];

  const handleSubmit = async (nextValue: string) => {
    if (!nextValue || !currentConversation) return;

    try {
      // Add user message to store
      await sendMessage(currentConversation.id, nextValue, 'user');
      setValue('');
      setLoading(true);

      // Simulate AI response
      setTimeout(async () => {
        try {
          await sendMessage(
            currentConversation.id,
            t('chat.processing'),
            'assistant'
          );
        } catch (error) {
          console.error('Failed to send AI response:', error);
          antMessage.error(t('common.error'));
        }
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Failed to send message:', error);
      antMessage.error(t('common.error'));
      setLoading(false);
    }
  };

  const onPromptsItemClick = (info: { data: PromptsItemType }) => {
    const key = info.data.key as string;
    if (key === 'resume') {
      setUploadDialogVisible(true);
    } else if (key === 'job') {
      setJobInputDialogVisible(true);
    } else if (key === 'pdf') {
      // Show PDF generation card in chat
      displayPDFGeneration('current-optimization-id');
    } else {
      const label = typeof info.data.label === 'string' ? info.data.label : '';
      if (label) {
        handleSubmit(label);
      }
    }
  };

  const handleResumeUploadSuccess = async (data: unknown): Promise<void> => {
    const uploadData = data as { resume: Resume; parsedData: ParsedResumeData };
    if (!currentConversation) return;

    try {
      // Add upload confirmation message
      await sendMessage(
        currentConversation.id,
        t('chat.upload_success', {
          filename: uploadData?.resume?.originalFilename || '简历文件',
        }),
        'assistant'
      );

      // Add parsed data summary message
      const parsedData = uploadData?.parsedData;

      if (parsedData?.markdown) {
        // If we have markdown, use it directly as the summary
        await sendMessage(currentConversation.id, parsedData.markdown, 'assistant');
      } else {
        // Fallback to manual summary if markdown is missing
        let summaryMessage = t('chat.parsed_resume_title') + '\n\n';

        if (parsedData?.personalInfo?.name) {
          summaryMessage += `${t('chat.parsed_name')}: ${parsedData.personalInfo.name}\n`;
        }
        if (parsedData?.personalInfo?.email) {
          summaryMessage += `${t('chat.parsed_email')}: ${parsedData.personalInfo.email}\n`;
        }
        if (parsedData?.skills && parsedData.skills.length > 0) {
          const count = parsedData.skills.length;
          const skillsString = parsedData.skills.slice(0, 5).join(', ');
          const extra =
            count > 5 ? ` ${t('common.total_items', { count: count - 5 })}` : '';
          summaryMessage += `${t('chat.parsed_skills')}: ${skillsString}${extra}\n`;
        }
        if (parsedData?.experience && parsedData.experience.length > 0) {
          summaryMessage += `${t('chat.parsed_experience')}: ${t('common.total_items', { count: parsedData.experience.length })}\n`;
        }
        if (parsedData?.education && parsedData.education.length > 0) {
          summaryMessage += `${t('chat.parsed_education')}: ${t('common.total_items', { count: parsedData.education.length })}\n`;
        }

        summaryMessage += '\n' + t('chat.parsed_next_steps');

        await sendMessage(currentConversation.id, summaryMessage, 'assistant');
      }

      setUploadDialogVisible(false);
    } catch (error) {
      console.error('Failed to send resume upload messages:', error);
      antMessage.error(t('common.error'));
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
        'assistant'
      );

      // Add job info card message with metadata
      await sendMessage(
        currentConversation.id,
        t('chat.job_extracted_title'),
        'assistant'
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

  const displayPDFGeneration = async (_optimizationId: string) => {
    if (!currentConversation) return;

    try {
      // Add PDF generation message with metadata
      await sendMessage(
        currentConversation.id,
        t('chat.pdf_ready'),
        'assistant'
      );
    } catch (error) {
      console.error('Failed to display PDF generation:', error);
      antMessage.error(t('common.error'));
    }
  };

  const uploadProps: UploadProps = {
    name: 'file',
    accept: '.pdf,.doc,.docx,.txt',
    showUploadList: false,
    beforeUpload: () => {
      setUploadDialogVisible(true);
      return false;
    },
  };

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        background: token.colorBgContainer,
      }}
    >
      {/* Chat Area */}
      <div
        className="chat-bubble-list"
        style={{ flex: 1, overflow: 'auto', padding: '24px' }}
      >
        <Bubble.List
          items={items.map((item) => ({
            key: item.key,
            role: item.role,
            placement:
              item.role === 'ai' ? ('start' as const) : ('end' as const),
            content:
              item.type === 'job' && item.jobData ? (
                <JobInfoCard
                  job={item.jobData}
                  onConfirm={() => {
                    antMessage.success(t('chat.job_confirmed'));
                  }}
                  onDelete={() => {
                    antMessage.success(t('chat.job_deleted'));
                  }}
                />
              ) : item.type === 'suggestions' &&
                item.suggestions &&
                item.optimizationId ? (
                <SuggestionsList
                  suggestions={item.suggestions}
                  onAccept={async (suggestionId) => {
                    try {
                      await optimizationService.acceptSuggestion(
                        item.optimizationId!,
                        suggestionId
                      );
                      const updated = await optimizationService.getOptimization(
                        item.optimizationId!
                      );
                      // Update the message with new suggestions
                      const updatedItems = items.map((i) => {
                        if (i.key === item.key) {
                          return {
                            ...i,
                            suggestions:
                              updated.suggestions as MessageItem['suggestions'],
                          };
                        }
                        return i;
                      });
                      setItems(updatedItems);
                    } catch (error) {
                      console.error('Failed to accept suggestion:', error);
                      throw error;
                    }
                  }}
                  onReject={async (suggestionId) => {
                    try {
                      await optimizationService.rejectSuggestion(
                        item.optimizationId!,
                        suggestionId
                      );
                      const updated = await optimizationService.getOptimization(
                        item.optimizationId!
                      );
                      // Update the message with new suggestions
                      const updatedItems = items.map((i) => {
                        if (i.key === item.key) {
                          return {
                            ...i,
                            suggestions:
                              updated.suggestions as MessageItem['suggestions'],
                          };
                        }
                        return i;
                      });
                      setItems(updatedItems);
                    } catch (error) {
                      console.error('Failed to reject suggestion:', error);
                      throw error;
                    }
                  }}
                />
              ) : item.type === 'pdf' && item.optimizationId ? (
                <PDFGenerationCard
                  optimizationId={item.optimizationId}
                  onGenerateSuccess={() => {
                    antMessage.success(t('chat.pdf_success'));
                  }}
                />
              ) : item.type === 'interview' &&
                item.interviewQuestions &&
                item.optimizationId ? (
                <InterviewQuestionsCard
                  questions={item.interviewQuestions}
                  optimizationId={item.optimizationId}
                  onExportSuccess={() => {
                    antMessage.success(t('chat.interview_exported'));
                  }}
                />
              ) : (
                <div className="markdown-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {item.content}
                  </ReactMarkdown>
                </div>
              ),
            avatar: item.role === 'ai' ? <RobotOutlined /> : <UserOutlined />,
          }))}
        />

        {/* Suggestions (only show if few messages) */}
        {items.length <= 1 && (
          <div
            style={{
              marginTop: '48px',
              maxWidth: '800px',
              margin: '48px auto 0',
            }}
          >
            <Prompts
              title={t('chat.try_asking')}
              items={suggestions}
              onItemClick={onPromptsItemClick}
            />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div
        className="chat-input-area"
        style={{
          padding: '16px 24px 24px',
          maxWidth: '800px',
          width: '100%',
          margin: '0 auto',
        }}
      >
        {/* Quick Actions */}
        {items.length <= 1 && (
          <div
            className="chat-quick-actions"
            style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '12px',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            <Button
              size="small"
              style={{ borderRadius: '16px' }}
              onClick={() => setUploadDialogVisible(true)}
            >
              📄 {t('suggestions.resume_label')}
            </Button>
            <Button
              size="small"
              style={{ borderRadius: '16px' }}
              onClick={() => setJobInputDialogVisible(true)}
            >
              💼 {t('suggestions.job_label')}
            </Button>
            <Button
              size="small"
              style={{ borderRadius: '16px' }}
              onClick={() => displayPDFGeneration('current-optimization-id')}
            >
              📋 {t('suggestions.pdf_label')}
            </Button>
            <Button
              size="small"
              style={{ borderRadius: '16px' }}
              onClick={() => handleSubmit(t('suggestions.interview_label'))}
            >
              🎤 {t('suggestions.interview_label')}
            </Button>
          </div>
        )}

        <Sender
          value={value}
          onChange={setValue}
          onSubmit={handleSubmit}
          loading={loading}
          placeholder={t('chat.placeholder')}
          prefix={
            <Upload {...uploadProps}>
              <div style={{ cursor: 'pointer', padding: '0 8px' }}>
                <CloudUploadOutlined
                  style={{
                    fontSize: '18px',
                    color: token.colorTextSecondary,
                  }}
                />
              </div>
            </Upload>
          }
        />
        <div
          style={{
            textAlign: 'center',
            marginTop: '12px',
            color: token.colorTextTertiary,
            fontSize: '12px',
          }}
        >
          {t('chat.ai_disclaimer')}
        </div>
      </div>

      {/* Resume Upload Dialog */}
      <ResumeUploadDialog
        visible={uploadDialogVisible}
        onClose={() => setUploadDialogVisible(false)}
        onUploadSuccess={handleResumeUploadSuccess}
      />

      {/* Job Input Dialog */}
      <JobInputDialog
        visible={jobInputDialogVisible}
        onClose={() => setJobInputDialogVisible(false)}
        onJobCreated={handleJobCreated}
      />
    </div>
  );
};

export default ChatPage;
