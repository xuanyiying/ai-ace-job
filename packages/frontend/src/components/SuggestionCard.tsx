import React, { useState } from 'react';
import {
  Card,
  Button,
  Space,
  Collapse,
  Tag,
  message,
  Spin,
  Tooltip,
} from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  CopyOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { theme } from 'antd';

export interface Suggestion {
  id: string;
  type: 'content' | 'keyword' | 'structure' | 'quantification';
  section: string;
  itemIndex?: number;
  original: string;
  optimized: string;
  reason: string;
  status: 'pending' | 'accepted' | 'rejected';
}

interface SuggestionCardProps {
  suggestion: Suggestion;
  onAccept: (suggestionId: string) => Promise<void>;
  onReject: (suggestionId: string) => Promise<void>;
  index: number;
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({
  suggestion,
  onAccept,
  onReject,
  index,
}) => {
  const { token } = theme.useToken();
  const [loading, setLoading] = useState(false);

  const typeColors: Record<string, string> = {
    content: 'blue',
    keyword: 'green',
    structure: 'orange',
    quantification: 'purple',
  };

  const typeLabels: Record<string, string> = {
    content: '内容优化',
    keyword: '关键词',
    structure: '结构调整',
    quantification: '量化指标',
  };

  const statusColors: Record<string, string> = {
    pending: 'default',
    accepted: 'success',
    rejected: 'error',
  };

  const statusLabels: Record<string, string> = {
    pending: '待处理',
    accepted: '已接受',
    rejected: '已拒绝',
  };

  const handleAccept = async () => {
    try {
      setLoading(true);
      await onAccept(suggestion.id);
      message.success('建议已接受');
    } catch (error) {
      console.error('Failed to accept suggestion:', error);
      message.error('接受建议失败');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    try {
      setLoading(true);
      await onReject(suggestion.id);
      message.success('建议已拒绝');
    } catch (error) {
      console.error('Failed to reject suggestion:', error);
      message.error('拒绝建议失败');
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = suggestion.status !== 'pending';

  return (
    <Card
      size="small"
      style={{
        marginBottom: '12px',
        borderLeft: `4px solid ${token.colorPrimary}`,
        opacity: isDisabled ? 0.7 : 1,
      }}
    >
      <Spin spinning={loading}>
        <div style={{ marginBottom: '12px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}
          >
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span
                style={{ fontWeight: 600, color: token.colorTextSecondary }}
              >
                建议 {index + 1}
              </span>
              <Tag color={typeColors[suggestion.type]}>
                {typeLabels[suggestion.type]}
              </Tag>
              <Tag color={statusColors[suggestion.status]}>
                {statusLabels[suggestion.status]}
              </Tag>
            </div>
            <span
              style={{
                fontSize: '12px',
                color: token.colorTextTertiary,
              }}
            >
              {suggestion.section}
            </span>
          </div>

          {/* Reason */}
          <div
            style={{
              marginBottom: '12px',
              padding: '8px 12px',
              backgroundColor: token.colorBgLayout,
              borderRadius: '4px',
              fontSize: '13px',
              color: token.colorTextSecondary,
            }}
          >
            💡 {suggestion.reason}
          </div>

          {/* Before and After Comparison */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              gap: '12px',
              alignItems: 'center',
              marginBottom: '12px',
            }}
          >
            {/* Original */}
            <div>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '4px',
                  color: token.colorTextSecondary,
                }}
              >
                原文
              </div>
              <div
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#fff2f0',
                  borderRadius: '4px',
                  fontSize: '13px',
                  color: token.colorText,
                  wordBreak: 'break-word',
                  maxHeight: '100px',
                  overflow: 'auto',
                }}
              >
                {suggestion.original}
              </div>
            </div>

            {/* Arrow */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <ArrowRightOutlined
                style={{
                  fontSize: '18px',
                  color: token.colorPrimary,
                }}
              />
            </div>

            {/* Optimized */}
            <div>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '4px',
                  color: token.colorTextSecondary,
                }}
              >
                优化后
              </div>
              <div
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#f6ffed',
                  borderRadius: '4px',
                  fontSize: '13px',
                  color: token.colorText,
                  wordBreak: 'break-word',
                  maxHeight: '100px',
                  overflow: 'auto',
                }}
              >
                {suggestion.optimized}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {!isDisabled && (
            <div
              style={{
                display: 'flex',
                gap: '8px',
                justifyContent: 'flex-end',
              }}
            >
              <Tooltip title="接受此建议">
                <Button
                  type="primary"
                  size="small"
                  icon={<CheckOutlined />}
                  onClick={handleAccept}
                  loading={loading}
                  disabled={isDisabled}
                >
                  接受
                </Button>
              </Tooltip>
              <Tooltip title="拒绝此建议">
                <Button
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={handleReject}
                  loading={loading}
                  disabled={isDisabled}
                >
                  拒绝
                </Button>
              </Tooltip>
            </div>
          )}

          {isDisabled && (
            <div
              style={{
                fontSize: '12px',
                color: token.colorTextTertiary,
                textAlign: 'right',
              }}
            >
              {suggestion.status === 'accepted' && '✓ 已接受此建议'}
              {suggestion.status === 'rejected' && '✗ 已拒绝此建议'}
            </div>
          )}
        </div>
      </Spin>
    </Card>
  );
};

export default SuggestionCard;
