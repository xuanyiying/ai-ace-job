import React, { useState } from 'react';
import { Modal, Input, Button, List, Typography, Space, Tag, message, Divider, Tooltip, Empty, Spin } from 'antd';
import {
  RocketOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CopyOutlined,
  SaveOutlined,
  BulbOutlined,
  DiffOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { optimizationService } from '../services/optimization-service';
import { jobService } from '../services/job-service';
import { Optimization, Suggestion, SuggestionStatus } from '../types';
import './ResumeOptimizationDialog.css';

const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;

interface ResumeOptimizationDialogProps {
  visible: boolean;
  resumeId: string;
  onClose: () => void;
  onSuccess: () => void;
  initialOptimizationId?: string;
}

export const ResumeOptimizationDialog: React.FC<ResumeOptimizationDialogProps> = ({
  visible,
  resumeId,
  onClose,
  onSuccess,
  initialOptimizationId,
}) => {
  const { t } = useTranslation();
  const [jdText, setJdText] = useState('');
  const [loading, setLoading] = useState(false);
  const [optimization, setOptimization] = useState<Optimization | null>(null);
  const [step, setStep] = useState<'input' | 'review'>('input');

  React.useEffect(() => {
    if (visible && initialOptimizationId) {
      fetchOptimization(initialOptimizationId);
    } else if (visible && !initialOptimizationId) {
      setStep('input');
      setOptimization(null);
      setJdText('');
    }
  }, [visible, initialOptimizationId]);

  const fetchOptimization = async (id: string) => {
    try {
      setLoading(true);
      const result = await optimizationService.getOptimization(id);
      setOptimization(result);
      setStep('review');
    } catch (error) {
      console.error('Failed to fetch optimization:', error);
      message.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleStartOptimization = async () => {
    if (!jdText.trim()) {
      message.warning(t('resume.jd_input_placeholder'));
      return;
    }

    try {
      setLoading(true);
      // 1. Create job from JD
      const job = await jobService.createJob({
        title: 'Target Position', // Default title
        company: 'Target Company',
        jobDescription: jdText,
        requirements: jdText, // Also use as requirements for backend logic
      });

      // 2. Start optimization
      const result = await optimizationService.createOptimization(resumeId, job.id);
      setOptimization(result);
      setStep('review');
    } catch (error) {
      console.error('Optimization failed:', error);
      message.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptSuggestion = async (suggestionId: string) => {
    if (!optimization) return;
    try {
      const updated = await optimizationService.acceptSuggestion(optimization.id, suggestionId);
      setOptimization(updated);
      message.success(t('common.operation_success'));
    } catch (error) {
      message.error(t('common.error'));
    }
  };

  const handleRejectSuggestion = async (suggestionId: string) => {
    if (!optimization) return;
    try {
      const updated = await optimizationService.rejectSuggestion(optimization.id, suggestionId);
      setOptimization(updated);
      message.success(t('common.operation_success'));
    } catch (error) {
      message.error(t('common.error'));
    }
  };

  const handleAcceptAll = async () => {
    if (!optimization) return;
    const pendingIds = optimization.suggestions
      .filter(s => s.status === SuggestionStatus.PENDING)
      .map(s => s.id);
    
    if (pendingIds.length === 0) return;

    try {
      const updated = await optimizationService.acceptBatchSuggestions(optimization.id, pendingIds);
      setOptimization(updated);
      message.success(t('common.operation_success'));
    } catch (error) {
      message.error(t('common.error'));
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success(t('resume.copy_content') + ' ' + t('common.success'));
  };

  const handleCopyOptimized = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success(t('common.copy_success'));
  };

  const renderDiff = (suggestion: Suggestion) => {
    return (
      <div className="diff-container">
        <div className="diff-section">
          <span className="diff-label">{t('resume.diff_original')}</span>
          <div className="diff-content diff-original">
            {suggestion.original}
          </div>
        </div>
        <div className="diff-section">
                <span className="diff-label">{t('resume.diff_optimized')}</span>
                <div className="diff-content diff-optimized group/opt">
                  {suggestion.optimized}
                  <Tooltip title={t('common.copy')}>
                    <Button
                      size="small"
                      icon={<CopyOutlined />}
                      className="absolute top-2 right-2 opacity-0 group-hover/opt:opacity-100 transition-opacity"
                      onClick={() => handleCopyOptimized(suggestion.optimized)}
                    />
                  </Tooltip>
                </div>
              </div>
        {suggestion.reason && (
          <div className="suggestion-reason-box">
            <BulbOutlined className="text-amber-500 mt-1" />
            <div className="suggestion-reason-text">
              {suggestion.reason}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Modal
      title={
        <Space>
          <RocketOutlined className="text-primary" />
          <span>{t('resume.optimization_title')}</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={900}
      footer={
        step === 'review' ? (
          <Space>
            <Button onClick={() => setStep('input')}>{t('common.back')}</Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={onSuccess}>
              {t('resume.apply_changes')}
            </Button>
          </Space>
        ) : (
          <Space>
            <Button onClick={onClose}>{t('common.cancel')}</Button>
            <Button 
              type="primary" 
              icon={<RocketOutlined />} 
              loading={loading}
              onClick={handleStartOptimization}
            >
              {t('common.submit')}
            </Button>
          </Space>
        )
      }
    >
      {step === 'input' ? (
        <div className="py-4">
          <Paragraph className="text-secondary mb-6">
            {t('resume.optimization_desc')}
          </Paragraph>
          <TextArea
            rows={12}
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            placeholder={t('resume.jd_input_placeholder')}
            className="jd-textarea"
          />
        </div>
      ) : (
        <div className="optimization-dialog-content custom-scrollbar">
          <div className="sticky-header">
            <div>
              <Text strong className="text-lg">
                AI 优化建议 ({optimization?.suggestions.length || 0})
              </Text>
            </div>
            <Space>
              <Button size="small" onClick={handleAcceptAll}>
                {t('resume.accept_all')}
              </Button>
            </Space>
          </div>

          {loading ? (
            <div className="py-20 text-center">
              <Spin tip={t('resume.optimizing')} />
            </div>
          ) : !optimization?.suggestions.length ? (
            <Empty description={t('resume.no_suggestions')} />
          ) : (
            <List
              dataSource={optimization.suggestions}
              renderItem={(suggestion) => (
                <List.Item className="optimization-list-item block">
                  <div className="flex justify-between items-start mb-3">
                    <Space split={<Divider type="vertical" />}>
                      <Tag className="tag-section">
                        {suggestion.section}
                      </Tag>
                      {suggestion.status === SuggestionStatus.ACCEPTED ? (
                        <Tag icon={<CheckCircleOutlined />} color="success">已接受</Tag>
                      ) : suggestion.status === SuggestionStatus.REJECTED ? (
                        <Tag icon={<CloseCircleOutlined />} color="error">已拒绝</Tag>
                      ) : (
                        <Tag color="warning">待处理</Tag>
                      )}
                    </Space>
                    <Space>
                      {suggestion.status === SuggestionStatus.PENDING && (
                        <>
                          <Tooltip title="接受建议">
                            <Button 
                              type="text" 
                              icon={<CheckCircleOutlined className="text-green-500" />} 
                              onClick={() => handleAcceptSuggestion(suggestion.id)}
                            />
                          </Tooltip>
                          <Tooltip title="拒绝建议">
                            <Button 
                              type="text" 
                              icon={<CloseCircleOutlined className="text-red-400" />} 
                              onClick={() => handleRejectSuggestion(suggestion.id)}
                            />
                          </Tooltip>
                        </>
                      )}
                      <Tooltip title={t('resume.copy_content')}>
                        <Button 
                          type="text" 
                          icon={<CopyOutlined className="text-gray-400" />} 
                          onClick={() => handleCopy(suggestion.optimized)}
                        />
                      </Tooltip>
                    </Space>
                  </div>
                  {renderDiff(suggestion)}
                </List.Item>
              )}
            />
          )}
        </div>
      )}
    </Modal>
  );
};
