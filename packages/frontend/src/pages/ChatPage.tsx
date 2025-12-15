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
  const { token } = theme.useToken();
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadDialogVisible, setUploadDialogVisible] = useState(false);
  const [jobInputDialogVisible, setJobInputDialogVisible] = useState(false);
  const [items, setItems] = useState<MessageItem[]>([
    {
      key: 'welcome',
      role: 'ai',
      content:
        '你好，我是 AI 简历助手。我可以帮你优化简历、进行模拟面试或润色自我介绍。',
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
          content:
            '你好，我是 AI 简历助手。我可以帮你优化简历、进行模拟面试或润色自我介绍。',
          type: 'text',
        },
        ...mappedItems,
      ]);
    }
  }, [messages]);

  const suggestions: PromptsItemType[] = [
    {
      key: 'resume',
      label: '简历优化',
      description: '帮我分析并优化当前简历',
      icon: <span style={{ fontSize: '16px' }}>📄</span>,
    },
    {
      key: 'job',
      label: '输入职位',
      description: '输入目标职位信息进行匹配分析',
      icon: <span style={{ fontSize: '16px' }}>💼</span>,
    },
    {
      key: 'pdf',
      label: '生成 PDF',
      description: '生成专业格式的 PDF 简历',
      icon: <span style={{ fontSize: '16px' }}>📋</span>,
    },
    {
      key: 'interview',
      label: '面试解忧',
      description: '针对职位的模拟面试',
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
            '收到！正在为您处理...',
            'assistant'
          );
        } catch (error) {
          console.error('Failed to send AI response:', error);
          antMessage.error('发送消息失败');
        }
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Failed to send message:', error);
      antMessage.error('发送消息失败');
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
        `✅ 已成功上传简历: ${uploadData?.resume?.originalFilename || '简历文件'}`,
        'assistant'
      );

      // Add parsed data summary message
      const parsedData = uploadData?.parsedData;
      let summaryMessage = '📋 简历解析完成，以下是提取的信息：\n\n';

      if (parsedData?.personalInfo?.name) {
        summaryMessage += `👤 **姓名**: ${parsedData.personalInfo.name}\n`;
      }
      if (parsedData?.personalInfo?.email) {
        summaryMessage += `📧 **邮箱**: ${parsedData.personalInfo.email}\n`;
      }
      if (parsedData?.skills && parsedData.skills.length > 0) {
        summaryMessage += `🛠️ **技能**: ${parsedData.skills.slice(0, 5).join(', ')}${parsedData.skills.length > 5 ? ` 等 ${parsedData.skills.length} 项` : ''}\n`;
      }
      if (parsedData?.experience && parsedData.experience.length > 0) {
        summaryMessage += `💼 **工作经历**: ${parsedData.experience.length} 项\n`;
      }
      if (parsedData?.education && parsedData.education.length > 0) {
        summaryMessage += `🎓 **教育背景**: ${parsedData.education.length} 项\n`;
      }

      summaryMessage +=
        '\n接下来，您可以：\n1. 输入职位描述进行匹配分析\n2. 请求简历优化建议\n3. 进行面试准备';

      await sendMessage(currentConversation.id, summaryMessage, 'assistant');

      setUploadDialogVisible(false);
    } catch (error) {
      console.error('Failed to send resume upload messages:', error);
      antMessage.error('发送消息失败');
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
        `✅ 已成功保存职位信息: ${createdJob.title} @ ${createdJob.company}`,
        'assistant'
      );

      // Add job info card message with metadata
      await sendMessage(
        currentConversation.id,
        `📋 职位信息已提取，以下是详细信息：`,
        'assistant'
      );

      setJobInputDialogVisible(false);
      antMessage.success('职位信息已保存');
    } catch (error) {
      console.error('Failed to create job:', error);
      antMessage.error('保存职位信息失败');
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
        '📄 PDF 生成工具已准备好',
        'assistant'
      );
    } catch (error) {
      console.error('Failed to display PDF generation:', error);
      antMessage.error('显示 PDF 生成工具失败');
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
                    antMessage.success('职位信息已确认');
                  }}
                  onDelete={() => {
                    antMessage.success('职位信息已删除');
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
                    antMessage.success('PDF 生成成功！');
                  }}
                />
              ) : item.type === 'interview' &&
                item.interviewQuestions &&
                item.optimizationId ? (
                <InterviewQuestionsCard
                  questions={item.interviewQuestions}
                  optimizationId={item.optimizationId}
                  onExportSuccess={() => {
                    antMessage.success('面试准备清单已导出');
                  }}
                />
              ) : (
                item.content
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
              title="你可以试着问我："
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
              📄 简历优化
            </Button>
            <Button
              size="small"
              style={{ borderRadius: '16px' }}
              onClick={() => setJobInputDialogVisible(true)}
            >
              💼 输入职位
            </Button>
            <Button
              size="small"
              style={{ borderRadius: '16px' }}
              onClick={() => displayPDFGeneration('current-optimization-id')}
            >
              📋 生成 PDF
            </Button>
            <Button
              size="small"
              style={{ borderRadius: '16px' }}
              onClick={() => handleSubmit('进行模拟面试')}
            >
              🎤 面试解忧
            </Button>
          </div>
        )}

        <Sender
          value={value}
          onChange={setValue}
          onSubmit={handleSubmit}
          loading={loading}
          placeholder="输入您的问题，或上传简历文件..."
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
          AI 生成的内容可能不准确，请核对重要信息。
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
