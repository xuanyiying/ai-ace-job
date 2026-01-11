import React from 'react';
import { Card, Button, Space, Typography, Tag } from 'antd';
import {
  DownloadOutlined,
  FilePdfOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

interface PDFDownloadCardProps {
  fileName: string;
  fileSize: number;
  downloadUrl: string;
  expiresAt: string;
}

/**
 * Component for displaying generated PDF download link and expiry
 * Requirements: 2.4
 */
const PDFDownloadCard: React.FC<PDFDownloadCardProps> = ({
  fileName,
  fileSize,
  downloadUrl,
  expiresAt,
}) => {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isExpired = dayjs().isAfter(dayjs(expiresAt));

  return (
    <Card
      className="pdf-download-card"
      style={{
        maxWidth: 400,
        borderRadius: 12,
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        border: '1px solid #e8e8e8',
      }}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space align="start">
          <FilePdfOutlined style={{ fontSize: 32, color: '#ff4d4f' }} />
          <div>
            <Title level={5} style={{ margin: 0 }}>
              {fileName}
            </Title>
            <Text type="secondary">{formatFileSize(fileSize)}</Text>
          </div>
        </Space>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ClockCircleOutlined
            style={{ color: isExpired ? '#ff4d4f' : '#faad14' }}
          />
          <Text type={isExpired ? 'danger' : 'warning'}>
            {isExpired
              ? '已过期'
              : `有效期至: ${dayjs(expiresAt).format('YYYY-MM-DD HH:mm')}`}
          </Text>
        </div>

        <Button
          type="primary"
          icon={<DownloadOutlined />}
          block
          href={downloadUrl}
          target="_blank"
          disabled={isExpired}
        >
          {isExpired ? '链接已过期' : '下载 PDF'}
        </Button>
      </Space>
    </Card>
  );
};

export default PDFDownloadCard;
