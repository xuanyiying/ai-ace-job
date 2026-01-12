import React from 'react';
import { Progress, Space, theme, Button } from 'antd';
import {
  FileTextOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';

export interface AttachmentStatus {
  fileName: string;
  fileSize: number;
  uploadProgress: number;
  parseProgress: number;
  status: 'uploading' | 'parsing' | 'completed' | 'error';
  error?: string;
  mode?: 'upload' | 'parse'; // New field to distinguish between upload and parse view
  resumeId?: string; // New field to track by resume ID
}

interface AttachmentMessageProps {
  status: AttachmentStatus;
  onDelete?: () => void;
  mode?: 'upload' | 'parse'; // Prop to override or set mode
}

const AttachmentMessage: React.FC<AttachmentMessageProps> = ({
  status,
  onDelete,
  mode: propMode,
}) => {
  const { token } = theme.useToken();
  const mode =
    propMode ||
    status.mode ||
    (status.status === 'uploading' ? 'upload' : 'parse');

  // If mode is upload, we only show upload progress
  // If mode is parse, we only show parse progress

  const isUploadMode = mode === 'upload';
  const isParseMode = mode === 'parse';

  return (
    <div
      className={`attachment-message ${isParseMode ? 'parse-mode' : 'upload-mode'}`}
      style={{
        padding: '12px 16px',
        background: isParseMode
          ? 'rgba(82, 196, 26, 0.05)'
          : 'rgba(255, 255, 255, 0.05)',
        borderRadius: '12px',
        border: `1px solid ${isParseMode ? 'rgba(82, 196, 26, 0.1)' : 'rgba(255, 255, 255, 0.1)'}`,
        maxWidth: '320px',
        marginTop: '8px',
      }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Space>
            <div
              style={{
                width: '32px',
                height: '32px',
                background: isParseMode
                  ? 'rgba(82, 196, 26, 0.1)'
                  : 'rgba(var(--primary-rgb), 0.1)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isParseMode ? '#52c41a' : 'var(--primary-color)',
              }}
            >
              <FileTextOutlined style={{ fontSize: '16px' }} />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div
                style={{
                  fontWeight: 500,
                  fontSize: '14px',
                  color: 'white',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '180px',
                }}
              >
                {status.fileName}
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.45)',
                }}
              >
                {(status.fileSize / 1024 / 1024).toFixed(2)} MB
              </div>
            </div>
          </Space>

          {status.status === 'completed' ? (
            <CheckCircleOutlined
              style={{ color: token.colorSuccess, fontSize: '18px' }}
            />
          ) : status.status === 'error' ? (
            <div style={{ color: token.colorError, fontSize: '12px' }}>
              失败
            </div>
          ) : (
            <LoadingOutlined
              style={{
                color: isParseMode ? '#52c41a' : 'var(--primary-color)',
              }}
            />
          )}

          {onDelete &&
            isUploadMode &&
            (status.status === 'completed' || status.status === 'error') && (
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={onDelete}
                style={{ marginLeft: '4px' }}
              />
            )}
        </div>

        {isUploadMode && status.status === 'uploading' && (
          <div>
            <div
              style={{
                fontSize: '11px',
                color: 'rgba(255, 255, 255, 0.45)',
                marginBottom: '4px',
              }}
            >
              正在上传文件... {Math.round(status.uploadProgress)}%
            </div>
            <Progress
              percent={Math.round(status.uploadProgress)}
              size="small"
              showInfo={false}
              strokeColor="var(--primary-color)"
              trailColor="rgba(255, 255, 255, 0.05)"
              className="custom-progress"
            />
          </div>
        )}

        {isParseMode &&
          (status.status === 'parsing' ||
            (status.status === 'completed' && isParseMode)) && (
            <div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'rgba(255, 255, 255, 0.45)',
                  marginBottom: '4px',
                }}
              >
                {status.status === 'completed'
                  ? '解析完成'
                  : `正在解析简历... ${Math.round(status.parseProgress)}%`}
              </div>
              <Progress
                percent={Math.round(status.parseProgress)}
                size="small"
                showInfo={false}
                strokeColor="#52c41a"
                trailColor="rgba(255, 255, 255, 0.05)"
                className="custom-progress"
              />
            </div>
          )}

        {status.status === 'error' && (
          <div style={{ fontSize: '12px', color: token.colorError }}>
            {status.error || '处理失败'}
          </div>
        )}
      </Space>
      <style>{`
        .custom-progress .ant-progress-inner {
          background-color: rgba(255, 255, 255, 0.05) !important;
        }
        .attachment-message {
          transition: all 0.3s ease;
          animation: slideUp 0.3s ease-out;
        }
        .attachment-message.parse-mode {
          border-left: 3px solid #52c41a !important;
        }
        .attachment-message.upload-mode {
          border-left: 3px solid var(--primary-color) !important;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default AttachmentMessage;
