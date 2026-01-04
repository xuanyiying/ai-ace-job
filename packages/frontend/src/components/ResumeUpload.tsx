import React, { useState } from 'react';
import {
  Upload,
  Button,
  Card,
  Progress,
  message,
  Empty,
  Form,
  Input,
  Space,
  Divider,
  Tag,
  Row,
  Col,
  Collapse,
  Alert,
} from 'antd';
import {
  InboxOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import type { UploadFile, RcFile } from 'antd/es/upload/interface';
import { resumeService } from '../services/resumeService';
import { useResumeStore } from '../stores/resumeStore';

interface ParsedResumeData {
  personalInfo: {
    name: string;
    email: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    github?: string;
    website?: string;
  };
  summary?: string;
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    startDate: string;
    endDate?: string;
    gpa?: string;
  }>;
  experience: Array<{
    company: string;
    position: string;
    startDate: string;
    endDate?: string;
    location?: string;
    description: string[];
  }>;
  skills: string[];
  projects?: Array<{
    name: string;
    description: string;
    technologies: string[];
    url?: string;
  }>;
}

interface UploadedResume {
  id: string;
  title: string;
  fileUrl?: string;
  parseStatus: 'pending' | 'processing' | 'completed' | 'failed';
  parsedData?: ParsedResumeData;
  createdAt: string;
}

const ResumeUpload: React.FC = () => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parsing, setParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  const [uploadedResumes, setUploadedResumes] = useState<UploadedResume[]>([]);
  const [form] = Form.useForm();
  const { addResume } = useResumeStore();

  const SUPPORTED_FORMATS = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const beforeUpload = (file: RcFile) => {
    const isSupported = SUPPORTED_FORMATS.includes(file.type);
    if (!isSupported) {
      message.error('仅支持 PDF、DOCX 和 TXT 格式的文件');
      return false;
    }

    const isLessThan10M = file.size <= MAX_FILE_SIZE;
    if (!isLessThan10M) {
      message.error('文件大小不能超过 10MB');
      return false;
    }

    return true;
  };

  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.error('请选择文件');
      return;
    }

    const file = fileList[0].originFileObj as RcFile;

    // Generate a unique filename with timestamp to prevent conflicts
    const timestamp = Date.now();
    const originalName = file.name;
    const fileExtension = originalName.substring(originalName.lastIndexOf('.'));
    const baseFileName = originalName.substring(
      0,
      originalName.lastIndexOf('.')
    );
    const uniqueFileName = `${baseFileName}_${timestamp}${fileExtension}`;

    const title = form.getFieldValue('title') || originalName;

    setUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 30;
        });
      }, 200);

      // Create a new File object with the unique name
      const renamedFile = new File([file], uniqueFileName, {
        type: file.type,
      });
      const response = await resumeService.uploadResume(renamedFile, title);

      clearInterval(progressInterval);
      setUploadProgress(100);

      const newResume: UploadedResume = {
        id: response.id,
        title: response.title,
        fileUrl: response.fileUrl,
        parseStatus: response.parseStatus || 'pending',
        createdAt: response.createdAt,
      };

      setUploadedResumes([newResume, ...uploadedResumes]);
      addResume({
        id: response.id,
        userId: response.userId,
        title: response.title,
        version: response.version || 1,
        isPrimary: response.isPrimary || false,
        parseStatus: response.parseStatus || 'pending',
        createdAt: response.createdAt,
        updatedAt: response.updatedAt,
      });

      message.success('文件上传成功，开始解析...');
      setFileList([]);
      form.resetFields();

      // Start parsing
      await handleParse(response.id);
    } catch (error: unknown) {
      const errorMessage =
        (error as any).response?.data?.message ||
        (error as Error).message ||
        '上传失败，请重试';
      message.error(errorMessage);
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleParse = async (resumeId: string) => {
    setParsing(true);
    setParseProgress(0);

    try {
      // Simulate parsing progress
      const progressInterval = setInterval(() => {
        setParseProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 25;
        });
      }, 300);

      const response = await resumeService.parseResume(resumeId);

      clearInterval(progressInterval);
      setParseProgress(100);

      // Update resume with parsed data
      setUploadedResumes((prev) =>
        prev.map((resume) =>
          resume.id === resumeId
            ? {
                ...resume,
                parseStatus: 'completed',
                parsedData: response.parsedData,
              }
            : resume
        )
      );

      message.success('简历解析完成');
    } catch (error: unknown) {
      const errorMessage =
        (error as any).response?.data?.message ||
        (error as Error).message ||
        '解析失败，请重试';
      message.error(errorMessage);
      console.error('Parse error:', error);
      setUploadedResumes((prev) =>
        prev.map((resume) =>
          resume.id === resumeId ? { ...resume, parseStatus: 'failed' } : resume
        )
      );
    } finally {
      setParsing(false);
      setParseProgress(0);
    }
  };

  const handleRemoveResume = (resumeId: string) => {
    setUploadedResumes((prev) => prev.filter((r) => r.id !== resumeId));
    message.success('已删除');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'processing':
        return <LoadingOutlined style={{ color: '#1890ff' }} />;
      case 'failed':
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <LoadingOutlined style={{ color: '#faad14' }} />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return '已解析';
      case 'processing':
        return '处理中';
      case 'failed':
        return '解析失败';
      default:
        return '待处理';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'processing':
        return 'processing';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Row gutter={[24, 24]}>
        {/* Upload Section */}
        <Col span={24}>
          <Card title="上传简历" bordered={false}>
            <Form form={form} layout="vertical">
              <Form.Item
                label="简历标题"
                name="title"
                rules={[{ message: '请输入简历标题' }]}
              >
                <Input placeholder="例如：2024年求职简历" />
              </Form.Item>

              <Form.Item label="选择文件">
                <Upload.Dragger
                  name="file"
                  multiple={false}
                  fileList={fileList}
                  onChange={(info) => {
                    setFileList(info.fileList);
                  }}
                  beforeUpload={beforeUpload}
                  accept=".pdf,.docx,.txt"
                >
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                  </p>
                  <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
                  <p className="ant-upload-hint">
                    支持 PDF、DOCX、TXT 格式，文件大小不超过 10MB
                  </p>
                </Upload.Dragger>
              </Form.Item>

              {uploading && (
                <Form.Item label="上传进度">
                  <Progress
                    percent={Math.round(uploadProgress)}
                    status={uploadProgress === 100 ? 'success' : 'active'}
                  />
                </Form.Item>
              )}

              {parsing && (
                <Form.Item label="解析进度">
                  <Progress
                    percent={Math.round(parseProgress)}
                    status={parseProgress === 100 ? 'success' : 'active'}
                  />
                </Form.Item>
              )}

              <Form.Item>
                <Button
                  type="primary"
                  size="large"
                  onClick={handleUpload}
                  loading={uploading || parsing}
                  disabled={fileList.length === 0 || uploading || parsing}
                >
                  {uploading
                    ? '上传中...'
                    : parsing
                      ? '解析中...'
                      : '上传并解析'}
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        {/* Uploaded Resumes Section */}
        {uploadedResumes.length > 0 && (
          <Col span={24}>
            <Card title="已上传的简历" bordered={false}>
              {uploadedResumes.map((resume) => (
                <div key={resume.id} style={{ marginBottom: '24px' }}>
                  <Row
                    justify="space-between"
                    align="middle"
                    style={{ marginBottom: '12px' }}
                  >
                    <Col>
                      <Space>
                        {getStatusIcon(resume.parseStatus)}
                        <div>
                          <div style={{ fontWeight: 500 }}>{resume.title}</div>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            {new Date(resume.createdAt).toLocaleDateString(
                              'zh-CN'
                            )}
                          </div>
                        </div>
                      </Space>
                    </Col>
                    <Col>
                      <Space>
                        <Tag color={getStatusColor(resume.parseStatus)}>
                          {getStatusLabel(resume.parseStatus)}
                        </Tag>
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => handleRemoveResume(resume.id)}
                        />
                      </Space>
                    </Col>
                  </Row>

                  {/* Parsed Data Display */}
                  {resume.parseStatus === 'completed' && resume.parsedData && (
                    <div style={{ marginTop: '16px' }}>
                      <Alert
                        message="解析结果预览"
                        type="info"
                        showIcon
                        style={{ marginBottom: '16px' }}
                      />

                      <Collapse
                        items={[
                          {
                            key: 'personal',
                            label: '个人信息',
                            children: (
                              <div>
                                <p>
                                  <strong>姓名:</strong>{' '}
                                  {resume.parsedData.personalInfo.name}
                                </p>
                                <p>
                                  <strong>邮箱:</strong>{' '}
                                  {resume.parsedData.personalInfo.email}
                                </p>
                                {resume.parsedData.personalInfo.phone && (
                                  <p>
                                    <strong>电话:</strong>{' '}
                                    {resume.parsedData.personalInfo.phone}
                                  </p>
                                )}
                                {resume.parsedData.personalInfo.location && (
                                  <p>
                                    <strong>地点:</strong>{' '}
                                    {resume.parsedData.personalInfo.location}
                                  </p>
                                )}
                              </div>
                            ),
                          },
                          {
                            key: 'education',
                            label: `教育背景 (${resume.parsedData.education.length})`,
                            children: (
                              <div>
                                {resume.parsedData.education.map((edu, idx) => (
                                  <div
                                    key={idx}
                                    style={{ marginBottom: '12px' }}
                                  >
                                    <p>
                                      <strong>{edu.institution}</strong>
                                    </p>
                                    <p>
                                      {edu.degree} - {edu.field}
                                    </p>
                                    <p
                                      style={{
                                        fontSize: '12px',
                                        color: '#666',
                                      }}
                                    >
                                      {edu.startDate} - {edu.endDate || '至今'}
                                    </p>
                                    <Divider style={{ margin: '8px 0' }} />
                                  </div>
                                ))}
                              </div>
                            ),
                          },
                          {
                            key: 'experience',
                            label: `工作经历 (${resume.parsedData.experience.length})`,
                            children: (
                              <div>
                                {resume.parsedData.experience.map(
                                  (exp, idx) => (
                                    <div
                                      key={idx}
                                      style={{ marginBottom: '12px' }}
                                    >
                                      <p>
                                        <strong>{exp.position}</strong> @{' '}
                                        {exp.company}
                                      </p>
                                      <p
                                        style={{
                                          fontSize: '12px',
                                          color: '#666',
                                        }}
                                      >
                                        {exp.startDate} -{' '}
                                        {exp.endDate || '至今'}
                                      </p>
                                      <ul>
                                        {exp.description.map((desc, i) => (
                                          <li key={i}>{desc}</li>
                                        ))}
                                      </ul>
                                      <Divider style={{ margin: '8px 0' }} />
                                    </div>
                                  )
                                )}
                              </div>
                            ),
                          },
                          {
                            key: 'skills',
                            label: `技能 (${resume.parsedData.skills.length})`,
                            children: (
                              <div>
                                <Space wrap>
                                  {resume.parsedData.skills.map(
                                    (skill, idx) => (
                                      <Tag key={idx}>{skill}</Tag>
                                    )
                                  )}
                                </Space>
                              </div>
                            ),
                          },
                        ]}
                      />
                    </div>
                  )}

                  {resume.parseStatus === 'failed' && (
                    <Alert
                      message="解析失败"
                      description="请检查文件格式是否正确，或尝试重新上传"
                      type="error"
                      showIcon
                      style={{ marginTop: '12px' }}
                    />
                  )}

                  <Divider />
                </div>
              ))}
            </Card>
          </Col>
        )}

        {/* Empty State */}
        {uploadedResumes.length === 0 && !uploading && !parsing && (
          <Col span={24}>
            <Card bordered={false}>
              <Empty
                description="暂无上传的简历"
                style={{ padding: '40px 0' }}
              />
            </Card>
          </Col>
        )}
      </Row>
    </div>
  );
};

export default ResumeUpload;
