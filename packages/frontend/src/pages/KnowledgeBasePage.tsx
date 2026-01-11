/**
 * Knowledge Base Management Page
 * Admin-only page for managing RAG knowledge base documents
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Upload,
  Modal,
  message,
  Tag,
  Space,
  Statistic,
  Row,
  Col,
  Drawer,
  Input,
  Select,
  Popconfirm,
  Empty,
  Spin,
} from 'antd';
import {
  UploadOutlined,
  DeleteOutlined,
  SearchOutlined,
  FileTextOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { UploadFile, UploadProps } from 'antd';
import type {
  KBDocument,
  KBStats,
  DocumentCategory,
  KBQueryResponse,
} from '@/types';
import * as knowledgeBaseService from '@/services/knowledge-base-service';
import './admin.css';

const { TextArea } = Input;
const { Option } = Select;

const KnowledgeBasePage: React.FC = () => {
  const { t } = useTranslation();

  // State
  const [documents, setDocuments] = useState<KBDocument[]>([]);
  const [stats, setStats] = useState<KBStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [queryDrawerOpen, setQueryDrawerOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // Upload state
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploadCategory, setUploadCategory] =
    useState<DocumentCategory>('general');
  const [uploadTags, setUploadTags] = useState<string>('');
  const [uploadTitle, setUploadTitle] = useState<string>('');

  // Query state
  const [queryText, setQueryText] = useState('');
  const [queryCategory, setQueryCategory] = useState<
    DocumentCategory | undefined
  >();
  const [queryResults, setQueryResults] = useState<KBQueryResponse | null>(
    null
  );
  const [querying, setQuerying] = useState(false);

  // Load data
  const loadData = async () => {
    setLoading(true);
    try {
      const [docsData, statsData] = await Promise.all([
        knowledgeBaseService.getDocuments(),
        knowledgeBaseService.getStats(),
      ]);
      setDocuments(docsData);
      setStats(statsData);
    } catch (error) {
      message.error(t('common.error', 'Error loading knowledge base'));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Upload handlers
  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.warning('Please select a file');
      return;
    }

    const file = fileList[0].originFileObj;
    if (!file) return;

    setUploading(true);
    try {
      await knowledgeBaseService.uploadDocument(file, {
        category: uploadCategory,
        tags: uploadTags
          ? uploadTags.split(',').map((t) => t.trim())
          : undefined,
        title: uploadTitle || undefined,
      });

      message.success('Document uploaded successfully');
      setUploadModalOpen(false);
      setFileList([]);
      setUploadTags('');
      setUploadTitle('');
      setUploadCategory('general');
      loadData();
    } catch (error) {
      message.error('Failed to upload document');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const uploadProps: UploadProps = {
    beforeUpload: (file) => {
      const isValidType =
        file.type === 'application/pdf' ||
        file.type ===
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.type === 'text/plain';

      if (!isValidType) {
        message.error('Only PDF, DOCX, and TXT files are supported');
        return false;
      }

      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error('File must be smaller than 10MB');
        return false;
      }

      return false; // Prevent auto upload
    },
    fileList,
    onChange: ({ fileList: newFileList }) => {
      setFileList(newFileList.slice(-1)); // Keep only the last file
    },
    maxCount: 1,
  };

  // Delete handler
  const handleDelete = async (id: string) => {
    try {
      await knowledgeBaseService.deleteDocument(id);
      message.success('Document deleted successfully');
      loadData();
    } catch (error) {
      message.error('Failed to delete document');
      console.error(error);
    }
  };

  // Query handler
  const handleQuery = async () => {
    if (!queryText.trim()) {
      message.warning('Please enter a query');
      return;
    }

    setQuerying(true);
    try {
      const results = await knowledgeBaseService.queryKnowledgeBase(queryText, {
        category: queryCategory,
        topK: 5,
        generateAnswer: true,
      });
      setQueryResults(results);
    } catch (error) {
      message.error('Failed to query knowledge base');
      console.error(error);
    } finally {
      setQuerying(false);
    }
  };

  // Clear KB handler
  const handleClearKB = async () => {
    try {
      await knowledgeBaseService.clearKnowledgeBase();
      message.success('Knowledge base cleared successfully');
      loadData();
    } catch (error) {
      message.error('Failed to clear knowledge base');
      console.error(error);
    }
  };

  // Helper functions
  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FilePdfOutlined style={{ color: '#ff4d4f' }} />;
      case 'docx':
        return <FileWordOutlined style={{ color: '#1890ff' }} />;
      default:
        return <FileTextOutlined style={{ color: '#52c41a' }} />;
    }
  };

  const getCategoryColor = (category: DocumentCategory) => {
    const colors: Record<DocumentCategory, string> = {
      interview_questions: 'blue',
      career_advice: 'green',
      industry_knowledge: 'purple',
      resume_tips: 'orange',
      general: 'default',
    };
    return colors[category];
  };

  // Table columns
  const columns = [
    {
      title: t('knowledge_base.doc_name'),
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: KBDocument) => (
        <Space>
          {getFileIcon(record.documentType)}
          <span>{title}</span>
        </Space>
      ),
    },
    {
      title: t('knowledge_base.category'),
      dataIndex: 'category',
      key: 'category',
      render: (category: DocumentCategory) => (
        <Tag color={getCategoryColor(category)}>
          {category.replace('_', ' ').toUpperCase()}
        </Tag>
      ),
    },
    {
      title: t('knowledge_base.tags'),
      dataIndex: 'tags',
      key: 'tags',
      render: (tags?: string[]) => (
        <>
          {tags?.map((tag) => (
            <Tag key={tag} style={{ marginBottom: 4 }}>
              {tag}
            </Tag>
          ))}
        </>
      ),
    },
    {
      title: t('knowledge_base.chunks'),
      dataIndex: 'chunkCount',
      key: 'chunkCount',
    },
    {
      title: t('knowledge_base.words'),
      dataIndex: 'wordCount',
      key: 'wordCount',
    },
    {
      title: t('common.created_at'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      render: (_: unknown, record: KBDocument) => (
        <Popconfirm
          title={t('knowledge_base.delete_confirm')}
          onConfirm={() => handleDelete(record.id)}
          okText={t('common.delete')}
          cancelText={t('common.cancel')}
          okButtonProps={{ danger: true }}
        >
          <Button type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div className="knowledge-base-page" style={{ padding: '24px' }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-secondary-400">
          {t('knowledge_base.title')}
        </h1>
        <p className="text-[var(--text-secondary)]">
          {t('knowledge_base.subtitle')}
        </p>
      </div>

      {/* Stats Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="glass-card">
            <Statistic
              title={t('knowledge_base.total_docs')}
              value={stats?.totalDocuments || 0}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="glass-card">
            <Statistic
              title={t('knowledge_base.total_chunks')}
              value={stats?.totalChunks || 0}
              prefix={<QuestionCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="glass-card">
            <Statistic
              title={t('knowledge_base.categories')}
              value={Object.keys(stats?.documentsByCategory || {}).length}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="glass-card">
            <Statistic
              title={t('knowledge_base.last_updated')}
              value={
                stats?.lastUpdated
                  ? new Date(stats.lastUpdated).toLocaleDateString()
                  : 'N/A'
              }
            />
          </Card>
        </Col>
      </Row>

      {/* Actions */}
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Button
            type="primary"
            icon={<UploadOutlined />}
            onClick={() => setUploadModalOpen(true)}
          >
            {t('knowledge_base.upload')}
          </Button>
          <Button
            icon={<SearchOutlined />}
            onClick={() => setQueryDrawerOpen(true)}
          >
            {t('knowledge_base.test_query')}
          </Button>
          <Button icon={<ReloadOutlined />} onClick={loadData}>
            {t('common.refresh')}
          </Button>
          <Popconfirm
            title={t('knowledge_base.clear_confirm')}
            onConfirm={handleClearKB}
            okText={t('knowledge_base.clear_all')}
            cancelText={t('common.cancel')}
            okButtonProps={{ danger: true }}
          >
            <Button danger icon={<ClearOutlined />}>
              {t('knowledge_base.clear_all')}
            </Button>
          </Popconfirm>
        </Space>
      </div>

      {/* Documents Table */}
      <Card className="glass-card">
        <Table
          columns={columns}
          dataSource={documents}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Upload Modal */}
      <Modal
        title={t('knowledge_base.upload_modal_title')}
        open={uploadModalOpen}
        onOk={handleUpload}
        onCancel={() => {
          setUploadModalOpen(false);
          setFileList([]);
          setUploadTags('');
          setUploadTitle('');
        }}
        confirmLoading={uploading}
        okText={t('knowledge_base.upload')}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Upload.Dragger {...uploadProps}>
            <p className="ant-upload-drag-icon">
              <UploadOutlined />
            </p>
            <p className="ant-upload-text">{t('knowledge_base.upload')}</p>
            <p className="ant-upload-hint">{t('knowledge_base.upload_hint')}</p>
          </Upload.Dragger>

          <div>
            <label>
              {t('knowledge_base.doc_title')} ({t('common.optional')})
            </label>
            <Input
              placeholder={t('knowledge_base.doc_title')}
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
            />
          </div>

          <div>
            <label>{t('knowledge_base.category')}</label>
            <Select
              style={{ width: '100%' }}
              value={uploadCategory}
              onChange={setUploadCategory}
            >
              <Option value="general">{t('common.default')}</Option>
              <Option value="interview_questions">Interview Questions</Option>
              <Option value="career_advice">Career Advice</Option>
              <Option value="industry_knowledge">Industry Knowledge</Option>
              <Option value="resume_tips">Resume Tips</Option>
            </Select>
          </div>

          <div>
            <label>{t('knowledge_base.doc_tags_hint')}</label>
            <Input
              placeholder="e.g., technical, frontend, react"
              value={uploadTags}
              onChange={(e) => setUploadTags(e.target.value)}
            />
          </div>
        </Space>
      </Modal>

      {/* Query Drawer */}
      <Drawer
        title={t('knowledge_base.query_drawer_title')}
        placement="right"
        width={600}
        open={queryDrawerOpen}
        onClose={() => setQueryDrawerOpen(false)}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <label>{t('common.search')}</label>
            <TextArea
              rows={3}
              placeholder={t('knowledge_base.query_placeholder')}
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
            />
          </div>

          <div>
            <label>{t('knowledge_base.filter_category')}</label>
            <Select
              style={{ width: '100%' }}
              value={queryCategory}
              onChange={setQueryCategory}
              allowClear
              placeholder={t('knowledge_base.all_categories')}
            >
              <Option value="interview_questions">Interview Questions</Option>
              <Option value="career_advice">Career Advice</Option>
              <Option value="industry_knowledge">Industry Knowledge</Option>
              <Option value="resume_tips">Resume Tips</Option>
              <Option value="general">General</Option>
            </Select>
          </div>

          <Button
            type="primary"
            block
            icon={<SearchOutlined />}
            onClick={handleQuery}
            loading={querying}
          >
            {t('common.search')}
          </Button>

          {queryResults && (
            <div>
              <h3>{t('knowledge_base.generated_answer')}</h3>
              {queryResults.answer ? (
                <Card className="glass-card" style={{ marginBottom: 16 }}>
                  <p>{queryResults.answer}</p>
                </Card>
              ) : (
                <Empty description="No answer generated" />
              )}

              <h3>
                {t('knowledge_base.retrieved_docs')} (
                {queryResults.totalResults})
              </h3>
              {queryResults.results.map((result, idx) => (
                <Card
                  key={result.id}
                  className="glass-card"
                  style={{ marginBottom: 12 }}
                  size="small"
                >
                  <div style={{ marginBottom: 8 }}>
                    <Tag color="blue">
                      {t('knowledge_base.similarity')}:{' '}
                      {(result.similarity * 100).toFixed(1)}%
                    </Tag>
                    <Tag>
                      {t('knowledge_base.chunk_info', { index: idx + 1 })}
                    </Tag>
                  </div>
                  <p
                    style={{
                      fontSize: '0.9em',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {result.content}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </Space>
      </Drawer>
    </div>
  );
};

export default KnowledgeBasePage;
