import React, { useState } from 'react';
import { Card, Button, Space, Row, Col, message, Typography, Tag } from 'antd';
import {
  FileTextOutlined,
  DownloadOutlined,
  SettingOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { GeneratedPDF } from '../stores/generateStore';

import { generateService } from '../services/generate-service';
import PDFGenerationDialog from './PDFGenerationDialog';

interface PDFGenerationCardProps {
  optimizationId: string;
  onGenerateSuccess?: (pdf: GeneratedPDF) => void;
}

const PDFGenerationCard: React.FC<PDFGenerationCardProps> = ({
  optimizationId,
  onGenerateSuccess,
}) => {
  const [dialogVisible, setDialogVisible] = useState(false);
  const [generatedPDF, setGeneratedPDF] = useState<GeneratedPDF | null>(null);
  const [downloading, setDownloading] = useState(false);

  const handleGenerateSuccess = (pdf: GeneratedPDF) => {
    setGeneratedPDF(pdf);
    if (onGenerateSuccess) {
      onGenerateSuccess(pdf);
    }
  };

  const handleDownload = async () => {
    if (!generatedPDF) {
      message.warning('请先生成 PDF');
      return;
    }

    try {
      setDownloading(true);
      await generateService.downloadPDF(
        generatedPDF.fileUrl,
        `resume-${new Date().getTime()}.pdf`
      );
      message.success('PDF 下载成功！');
    } catch (error) {
      console.error('Failed to download PDF:', error);
      message.error('下载 PDF 失败');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <Card
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: '#fff',
          borderRadius: '8px',
          border: 'none',
        }}
      >
        <Row gutter={[16, 16]} align="middle">
          <Col span={24}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FileTextOutlined style={{ fontSize: '24px' }} />
              <div>
                <h3 style={{ margin: 0, color: '#fff' }}>
                  📄 生成专业 PDF 简历
                </h3>
                <p
                  style={{
                    margin: '4px 0 0 0',
                    opacity: 0.9,
                    fontSize: '12px',
                  }}
                >
                  选择模板、自定义样式、一键生成
                </p>
              </div>
            </div>
          </Col>

          {generatedPDF && (
            <Col span={24}>
              <Row gutter={[16, 16]}>
                <Col xs={12} sm={8}>
                  <div
                    style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}
                  >
                    文件大小
                  </div>
                  <div
                    style={{
                      color: '#fff',
                      fontSize: '14px',
                      marginTop: '4px',
                    }}
                  >
                    {(generatedPDF.fileSize / 1024).toFixed(2)} KB
                  </div>
                </Col>
                <Col xs={12} sm={8}>
                  <div
                    style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}
                  >
                    下载次数
                  </div>
                  <div
                    style={{
                      color: '#fff',
                      fontSize: '14px',
                      marginTop: '4px',
                    }}
                  >
                    {generatedPDF.downloadCount}
                  </div>
                </Col>
                <Col xs={12} sm={6}>
                  <div
                    style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}
                  >
                    生成时间
                  </div>
                  <div
                    style={{
                      color: '#fff',
                      fontSize: '12px',
                      marginTop: '4px',
                    }}
                  >
                    {dayjs(generatedPDF.createdAt).format('HH:mm:ss')}
                  </div>
                </Col>
                <Col xs={12} sm={10}>
                  <div
                    style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}
                  >
                    有效期至 (24h)
                  </div>
                  <div
                    style={{
                      color: '#fff',
                      fontSize: '12px',
                      marginTop: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <ClockCircleOutlined style={{ fontSize: '12px' }} />
                    {generatedPDF.expiresAt
                      ? dayjs(generatedPDF.expiresAt).format('MM-DD HH:mm')
                      : dayjs(generatedPDF.createdAt)
                          .add(24, 'hour')
                          .format('MM-DD HH:mm')}
                  </div>
                </Col>
              </Row>
            </Col>
          )}

          <Col span={24}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              {generatedPDF &&
                dayjs().isAfter(
                  dayjs(
                    generatedPDF.expiresAt ||
                      dayjs(generatedPDF.createdAt).add(24, 'hour')
                  )
                ) && (
                  <Tag color="error" style={{ marginRight: 8 }}>
                    链接已过期
                  </Tag>
                )}
              <Button
                icon={<SettingOutlined />}
                onClick={() => setDialogVisible(true)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.3)',
                }}
              >
                {generatedPDF ? '重新生成' : '开始生成'}
              </Button>
              {generatedPDF && (
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  loading={downloading}
                  disabled={dayjs().isAfter(
                    dayjs(
                      generatedPDF.expiresAt ||
                        dayjs(generatedPDF.createdAt).add(24, 'hour')
                    )
                  )}
                  onClick={handleDownload}
                  style={{
                    background: '#fff',
                    color: '#667eea',
                    border: 'none',
                  }}
                >
                  下载 PDF
                </Button>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      <PDFGenerationDialog
        visible={dialogVisible}
        optimizationId={optimizationId}
        onClose={() => setDialogVisible(false)}
        onGenerateSuccess={handleGenerateSuccess}
      />
    </>
  );
};

export default PDFGenerationCard;
