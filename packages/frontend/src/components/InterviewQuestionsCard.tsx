import React, { useState } from 'react';
import {
  Card,
  Tag,
  Space,
  Collapse,
  Button,
  Empty,
  Divider,
  message as antMessage,
  Spin,
} from 'antd';
import { DownloadOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { theme } from 'antd';
import type { InterviewQuestion } from '../types';
import { interviewService } from '../services/interviewService';

interface InterviewQuestionsCardProps {
  questions: InterviewQuestion[];
  optimizationId: string;
  onExportSuccess?: () => void;
}

const InterviewQuestionsCard: React.FC<InterviewQuestionsCardProps> = ({
  questions,
  optimizationId,
  onExportSuccess,
}) => {
  const { token } = theme.useToken();
  const [exporting, setExporting] = useState(false);

  const getQuestionTypeLabel = (
    type: 'behavioral' | 'technical' | 'situational' | 'resume_based'
  ) => {
    const typeMap: Record<string, string> = {
      behavioral: '行为面试',
      technical: '技术面试',
      situational: '情景面试',
      resume_based: '简历相关',
    };
    return typeMap[type] || type;
  };

  const getQuestionTypeColor = (
    type: 'behavioral' | 'technical' | 'situational' | 'resume_based'
  ): string => {
    const colorMap: Record<string, string> = {
      behavioral: 'blue',
      technical: 'purple',
      situational: 'orange',
      resume_based: 'green',
    };
    return colorMap[type] || 'default';
  };

  const getDifficultyInfo = (difficulty: 'easy' | 'medium' | 'hard') => {
    const difficultyMap: Record<string, { label: string; color: string }> = {
      easy: { label: '简单', color: 'green' },
      medium: { label: '中等', color: 'orange' },
      hard: { label: '困难', color: 'red' },
    };
    return difficultyMap[difficulty] || { label: difficulty, color: 'default' };
  };

  const countByType = (type: string) => {
    return questions.filter((q) => q.questionType === type).length;
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      await interviewService.exportInterviewPrep(optimizationId);
      antMessage.success('面试准备清单已导出');
      onExportSuccess?.();
    } catch (error) {
      console.error('Failed to export interview prep:', error);
      antMessage.error('导出失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  if (questions.length === 0) {
    return (
      <Card
        style={{
          marginTop: '16px',
          background: token.colorBgContainer,
          border: `1px solid ${token.colorBorder}`,
        }}
        title="🎤 面试准备"
      >
        <Empty description="暂无面试问题" />
      </Card>
    );
  }

  const groupedQuestions = {
    behavioral: questions.filter((q) => q.questionType === 'behavioral'),
    technical: questions.filter((q) => q.questionType === 'technical'),
    situational: questions.filter((q) => q.questionType === 'situational'),
    resume_based: questions.filter((q) => q.questionType === 'resume_based'),
  };

  const collapseItems = Object.entries(groupedQuestions)
    .filter(([, items]) => items.length > 0)
    .map(([type, items]) => {
      const typeKey = type as keyof typeof groupedQuestions;
      return {
        key: type,
        label: (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span>{getQuestionTypeLabel(typeKey as any)}</span>
            <Tag color={getQuestionTypeColor(typeKey as any)}>
              {items.length} 题
            </Tag>
          </div>
        ),
        children: (
          <Space direction="vertical" style={{ width: '100%' }}>
            {items.map((question, index) => {
              const difficulty = getDifficultyInfo(question.difficulty);
              return (
                <div
                  key={question.id}
                  style={{
                    padding: '12px',
                    background: token.colorBgElevated,
                    border: `1px solid ${token.colorBorder}`,
                    borderRadius: '4px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '12px',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: 500,
                          marginBottom: '8px',
                        }}
                      >
                        {index + 1}. {question.question}
                      </div>
                    </div>
                    <Tag color={difficulty.color} style={{ marginLeft: '8px' }}>
                      {difficulty.label}
                    </Tag>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 500,
                        color: token.colorTextSecondary,
                        marginBottom: '8px',
                      }}
                    >
                      📝 参考答案框架
                    </div>
                    <div
                      style={{
                        padding: '8px 12px',
                        background: token.colorBgContainer,
                        borderLeft: `3px solid ${token.colorPrimary}`,
                        fontSize: '13px',
                        lineHeight: '1.6',
                        color: token.colorText,
                      }}
                    >
                      {question.suggestedAnswer}
                    </div>
                  </div>

                  {question.tips && question.tips.length > 0 && (
                    <div>
                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: 500,
                          color: token.colorTextSecondary,
                          marginBottom: '8px',
                        }}
                      >
                        💡 回答要点
                      </div>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        {question.tips.map((tip, tipIndex) => (
                          <div
                            key={tipIndex}
                            style={{
                              display: 'flex',
                              gap: '8px',
                              alignItems: 'flex-start',
                              fontSize: '13px',
                            }}
                          >
                            <CheckCircleOutlined
                              style={{
                                color: token.colorSuccess,
                                marginTop: '2px',
                                flexShrink: 0,
                              }}
                            />
                            <span>{tip}</span>
                          </div>
                        ))}
                      </Space>
                    </div>
                  )}
                </div>
              );
            })}
          </Space>
        ),
      };
    });

  return (
    <Card
      style={{
        marginTop: '16px',
        background: token.colorBgContainer,
        border: `1px solid ${token.colorBorder}`,
      }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span>🎤 面试准备</span>
          <Tag>{questions.length} 题</Tag>
        </div>
      }
      extra={
        <Button
          type="primary"
          size="small"
          icon={<DownloadOutlined />}
          loading={exporting}
          onClick={handleExport}
        >
          导出 PDF
        </Button>
      }
    >
      <div
        style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '16px',
          flexWrap: 'wrap',
        }}
      >
        {countByType('behavioral') > 0 && (
          <div
            style={{
              padding: '8px 12px',
              background: '#e6f7ff',
              border: `1px solid #91d5ff`,
              borderRadius: '4px',
              fontSize: '13px',
            }}
          >
            <span style={{ fontWeight: 500 }}>行为面试:</span>{' '}
            {countByType('behavioral')} 题
          </div>
        )}
        {countByType('technical') > 0 && (
          <div
            style={{
              padding: '8px 12px',
              background: '#f9f0ff',
              border: `1px solid #d3adf7`,
              borderRadius: '4px',
              fontSize: '13px',
            }}
          >
            <span style={{ fontWeight: 500 }}>技术面试:</span>{' '}
            {countByType('technical')} 题
          </div>
        )}
        {countByType('situational') > 0 && (
          <div
            style={{
              padding: '8px 12px',
              background: '#fff7e6',
              border: `1px solid #ffd591`,
              borderRadius: '4px',
              fontSize: '13px',
            }}
          >
            <span style={{ fontWeight: 500 }}>情景面试:</span>{' '}
            {countByType('situational')} 题
          </div>
        )}
        {countByType('resume_based') > 0 && (
          <div
            style={{
              padding: '8px 12px',
              background: '#f6ffed',
              border: `1px solid #b7eb8f`,
              borderRadius: '4px',
              fontSize: '13px',
            }}
          >
            <span style={{ fontWeight: 500 }}>简历相关:</span>{' '}
            {countByType('resume_based')} 题
          </div>
        )}
      </div>

      <Divider />

      <Spin spinning={exporting}>
        <Collapse
          items={collapseItems}
          defaultActiveKey={Object.keys(groupedQuestions).filter(
            (key) =>
              groupedQuestions[key as keyof typeof groupedQuestions].length > 0
          )}
        />
      </Spin>

      <div
        style={{
          marginTop: '16px',
          padding: '12px',
          background: '#fffbe6',
          border: `1px solid #ffe58f`,
          borderRadius: '4px',
          fontSize: '12px',
          color: token.colorTextSecondary,
        }}
      >
        <div style={{ marginBottom: '4px' }}>
          <strong>💡 面试准备建议：</strong>
        </div>
        <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
          <li>使用 STAR 法则（情境、任务、行动、结果）组织答案</li>
          <li>准备具体的例子和数据来支持你的答案</li>
          <li>练习清晰、简洁地表达你的想法</li>
          <li>提前准备可能的追问和深入问题</li>
        </ul>
      </div>
    </Card>
  );
};

export default InterviewQuestionsCard;
