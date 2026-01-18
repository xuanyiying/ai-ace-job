import React, { useState } from 'react';
import { strategistService, interviewService } from '../services';
import { ParsedResumeData } from '../types';
import { ArrowLeftOutlined, ReadOutlined, AppstoreOutlined } from '@ant-design/icons';
import { Button, Tabs, Typography } from 'antd';
import StreamingMarkdownBubble from './StreamingMarkdownBubble';
import './StrategistCard.css';

const { Title } = Typography;

interface StrategistCardProps {
  resumeData: ParsedResumeData;
  jobDescription: string;
  onBack?: () => void;
}

interface InterviewQuestion {
  id: string;
  question: string;
  category: 'technical' | 'behavioral' | 'scenario';
  difficulty: 'easy' | 'medium' | 'hard';
  priority: 'must-prepare' | 'important' | 'optional';
  source: 'custom' | 'knowledge-base';
}

interface QuestionBankResult {
  questions: InterviewQuestion[];
  categorization: {
    technical: number;
    behavioral: number;
    scenario: number;
  };
  totalQuestions: number;
  focusAreas: string[];
}

type SortBy = 'priority' | 'difficulty' | 'category';
type FilterCategory = 'all' | 'technical' | 'behavioral' | 'scenario';

export const StrategistCard: React.FC<StrategistCardProps> = ({
  resumeData,
  jobDescription,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState('question-bank');
  const [experienceLevel, setExperienceLevel] = useState<
    'junior' | 'mid' | 'senior'
  >('mid');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QuestionBankResult | null>(null);
  const [guideContent, setGuideContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>('priority');
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await strategistService.generateQuestionBank(
        resumeData,
        jobDescription,
        experienceLevel
      );
      setResult(response);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to generate question bank'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateGuide = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await interviewService.getPreparationGuide({
        type: 'guide',
        resumeData: resumeData as unknown as Record<string, any>,
        jobDescription,
        language: 'zh-CN',
      });
      setGuideContent(response.content);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to generate preparation guide'
      );
    } finally {
      setLoading(false);
    }
  };

  const getFilteredAndSortedQuestions = (): InterviewQuestion[] => {
    if (!result) return [];

    let filtered = result.questions;

    // Apply category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter((q) => q.category === filterCategory);
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'priority') {
        const priorityOrder = { 'must-prepare': 0, important: 1, optional: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      } else if (sortBy === 'difficulty') {
        const difficultyOrder = { easy: 0, medium: 1, hard: 2 };
        return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
      } else {
        return a.category.localeCompare(b.category);
      }
    });

    return sorted;
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'must-prepare':
        return '#dc3545';
      case 'important':
        return '#ffc107';
      case 'optional':
        return '#6c757d';
      default:
        return '#999';
    }
  };

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty) {
      case 'easy':
        return '#28a745';
      case 'medium':
        return '#ffc107';
      case 'hard':
        return '#dc3545';
      default:
        return '#999';
    }
  };

  const filteredQuestions = getFilteredAndSortedQuestions();

  return (
    <div className="strategist-card">
      <div className="flex items-center gap-4 mb-6">
        {onBack && (
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={onBack}
            className="integrated-back-btn"
          />
        )}
        <h2 style={{ margin: 0 }}>面试预测与备战</h2>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'question-bank',
            label: (
              <span>
                <AppstoreOutlined />
                面试题库
              </span>
            ),
            children: (
              <>
                {/* Configuration Section */}
                <div className="strategist-config">
                  <div className="config-group">
                    <label htmlFor="experience">经验等级：</label>
                    <select
                      id="experience"
                      value={experienceLevel}
                      onChange={(e) => setExperienceLevel(e.target.value as any)}
                      disabled={loading}
                    >
                      <option value="junior">初级 (0-2年)</option>
                      <option value="mid">中级 (2-5年)</option>
                      <option value="senior">高级 (5年以上)</option>
                    </select>
                  </div>

                  <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="btn-primary"
                  >
                    {loading ? '正在生成...' : '生成面试题库'}
                  </button>
                </div>

                {/* Error Display */}
                {error && <div className="error-message">{error}</div>}

                {/* Results Section */}
                {result && (
                  <div className="strategist-results">
                    {/* Summary Stats */}
                    <div className="result-section summary-section">
                      <h3>题库概览</h3>
                      <div className="summary-stats">
                        <div className="stat-card">
                          <div className="stat-number">{result.totalQuestions}</div>
                          <div className="stat-label">总题目数</div>
                        </div>
                        <div className="stat-card">
                          <div className="stat-number">
                            {result.categorization.technical}
                          </div>
                          <div className="stat-label">技术面试</div>
                        </div>
                        <div className="stat-card">
                          <div className="stat-number">
                            {result.categorization.behavioral}
                          </div>
                          <div className="stat-label">行为面试</div>
                        </div>
                        <div className="stat-card">
                          <div className="stat-number">
                            {result.categorization.scenario}
                          </div>
                          <div className="stat-label">场景面试</div>
                        </div>
                      </div>
                    </div>

                    {/* Focus Areas */}
                    {result.focusAreas && result.focusAreas.length > 0 && (
                      <div className="result-section">
                        <h3>重点关注领域</h3>
                        <div className="focus-areas">
                          {result.focusAreas.map((area, idx) => (
                            <span key={idx} className="focus-tag">
                              {area}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Filters and Sorting */}
                    <div className="result-section controls-section">
                      <div className="controls">
                        <div className="control-group">
                          <label htmlFor="filter">分类筛选:</label>
                          <select
                            id="filter"
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value as any)}
                          >
                            <option value="all">所有类型</option>
                            <option value="technical">技术面试</option>
                            <option value="behavioral">行为面试</option>
                            <option value="scenario">场景面试</option>
                          </select>
                        </div>

                        <div className="control-group">
                          <label htmlFor="sort">排序方式:</label>
                          <select
                            id="sort"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                          >
                            <option value="priority">重要程度</option>
                            <option value="difficulty">难度系数</option>
                            <option value="category">题目类型</option>
                          </select>
                        </div>
                      </div>
                      <div className="results-count">
                        显示 {filteredQuestions.length} / {result.totalQuestions}{' '}
                        个预测问题
                      </div>
                    </div>

                    {/* Questions List */}
                    <div className="result-section questions-section">
                      <h3>预测面试题</h3>
                      <div className="questions-list">
                        {filteredQuestions.length > 0 ? (
                          filteredQuestions.map((question, idx) => (
                            <div key={question.id} className="question-item">
                              <div className="question-header">
                                <span className="question-text">
                                  <span
                                    className="question-number"
                                    style={{ marginRight: '1rem', opacity: 0.5 }}
                                  >
                                    {idx + 1}.
                                  </span>
                                  {question.question}
                                </span>
                              </div>
                              <div className="question-badges">
                                <span
                                  className="badge badge-priority"
                                  style={{
                                    backgroundColor: getPriorityColor(question.priority),
                                  }}
                                >
                                  {question.priority === 'must-prepare'
                                    ? '必准备'
                                    : question.priority === 'important'
                                      ? '重点'
                                      : '可选'}
                                </span>
                                <span
                                  className="badge badge-difficulty"
                                  style={{
                                    color: getDifficultyColor(question.difficulty),
                                    border: `1px solid ${getDifficultyColor(question.difficulty)}`,
                                    backgroundColor: 'transparent',
                                  }}
                                >
                                  {question.difficulty === 'easy'
                                    ? '容易'
                                    : question.difficulty === 'medium'
                                      ? '中等'
                                      : '困难'}
                                </span>
                                <span className="badge badge-category">
                                  {question.category === 'technical'
                                    ? '技术'
                                    : question.category === 'behavioral'
                                      ? '行为'
                                      : '场景'}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div
                            className="no-results"
                            style={{
                              textAlign: 'center',
                              padding: '2rem',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            没有符合筛选条件的题目
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ),
          },
          {
            key: 'preparation-guide',
            label: (
              <span>
                <ReadOutlined />
                备战指南
              </span>
            ),
            children: (
              <div className="strategist-results">
                {!guideContent ? (
                  <div className="text-center py-12">
                    <Title level={4}>获取您的专属面试备战指南</Title>
                    <p className="text-gray-500 mb-6">
                      基于您的简历和目标职位，为您生成包含算法策略、行为面试技巧（STAR法则）及系统设计重点的全方位指南。
                    </p>
                    <Button
                      type="primary"
                      size="large"
                      onClick={handleGenerateGuide}
                      loading={loading}
                    >
                      生成备战指南
                    </Button>
                  </div>
                ) : (
                  <div className="guide-content p-6 bg-white rounded-lg shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                      <Title level={4} style={{ margin: 0 }}>专属备战指南</Title>
                      <Button onClick={handleGenerateGuide} loading={loading}>
                        重新生成
                      </Button>
                    </div>
                    <div className="markdown-body">
                      <StreamingMarkdownBubble content={guideContent} isStreaming={true} />
                    </div>
                  </div>
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
};
