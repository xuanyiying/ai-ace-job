import React, { useState } from 'react';
import {
  Modal,
  Upload,
  Button,
  Progress,
  Spin,
  message,
  Form,
  Input,
  Divider,
  Alert,
} from 'antd';
import {
  CloudUploadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import type { UploadProps, UploadFile } from 'antd';
import { resumeService } from '../services/resumeService';
import { theme } from 'antd';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ResumeUploadDialogProps {
  visible: boolean;
  onClose: () => void;
  onUploadSuccess: (resumeData: any) => void;
}

interface ParsedResumeData {
  personalInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
  };
  education?: Array<{
    institution: string;
    degree: string;
    field: string;
  }>;
  experience?: Array<{
    company: string;
    position: string;
    description: string[];
  }>;
  skills?: string[];
  markdown?: string;
  extractedText?: string;
}

const { TextArea } = Input;

const ResumeUploadDialog: React.FC<ResumeUploadDialogProps> = ({
  visible,
  onClose,
  onUploadSuccess,
}) => {
  const { token } = theme.useToken();
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedResume, setUploadedResume] = useState<any>(null);
  const [parsedData, setParsedData] = useState<ParsedResumeData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleConfirm = async () => {
    const resumeText: string = form.getFieldValue('resumeText');
    const hasText = !!resumeText && resumeText.trim().length > 0;
    const title = form.getFieldValue('title');

    let finalResume = uploadedResume;
    let finalParsedData = parsedData;

    try {
      if (fileList.length > 0 && !uploadedResume) {
        const file = fileList[0] as unknown as File;

        // Generate a unique filename
        const timestamp = Date.now();
        const originalName = file.name;
        const fileExtension = originalName.substring(
          originalName.lastIndexOf('.')
        );
        const baseFileName = originalName.substring(
          0,
          originalName.lastIndexOf('.')
        );
        const uniqueFileName = `${baseFileName}_${timestamp}${fileExtension}`;
        const renamedFile = new File([file], uniqueFileName, {
          type: file.type,
        });

        setUploading(true);
        setUploadProgress(0);

        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => (prev >= 90 ? 90 : prev + 10));
        }, 200);

        finalResume = await resumeService.uploadResume(
          renamedFile,
          title || originalName
        );
        clearInterval(progressInterval);
        setUploadProgress(100);
        setUploadedResume(finalResume);

        message.success('文件上传成功，正在解析...');

        setParsing(true);
        finalParsedData = await resumeService.parseResume(finalResume.id);
        setParsedData(finalParsedData);
        message.success('简历解析完成');
      }

      if (!finalResume && !finalParsedData && !hasText) {
        message.error('请上传简历文件或粘贴简历内容');
        return;
      }

      if (finalResume && finalParsedData) {
        onUploadSuccess({
          resume: finalResume,
          parsedData: finalParsedData,
        });
      } else if (hasText) {
        onUploadSuccess({
          resume: {
            id: 'manual-text',
            originalFilename: '粘贴的简历内容',
            source: 'manual',
          },
          parsedData: null,
          rawText: resumeText.trim(),
        });
      }

      // Reset and close
      setFileList([]);
      form.resetFields();
      setUploadedResume(null);
      setParsedData(null);
      setUploadProgress(0);
      setParseError(null);
      onClose();
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : '操作失败，请重试';
      message.error(errorMsg);
      console.error('Confirm error:', error);
    } finally {
      setUploading(false);
      setParsing(false);
    }
  };

  const handleCancel = () => {
    setFileList([]);
    form.resetFields();
    setUploadedResume(null);
    setParsedData(null);
    setUploadProgress(0);
    setParseError(null);
    onClose();
  };

  const uploadProps: UploadProps = {
    name: 'file',
    fileList,
    accept: '.pdf,.doc,.docx',
    maxCount: 1,
    beforeUpload: (file) => {
      const isPDF = file.type === 'application/pdf';
      const isDoc =
        file.type === 'application/msword' ||
        file.type ===
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

      if (!isPDF && !isDoc) {
        message.error('只能上传 PDF 或 Word 文档！');
        return false;
      }

      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error('文件大小不能超过 10MB！');
        return false;
      }

      setFileList([file]);
      return false; // Prevent automatic upload
    },
    onRemove: () => {
      setFileList([]);
    },
  };
  return (
    <Modal
      title="上传简历"
      open={visible}
      onCancel={handleCancel}
      width={600}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          取消
        </Button>,
        <Button
          key="confirm"
          type="primary"
          onClick={handleConfirm}
          disabled={uploading || parsing}
          loading={uploading || parsing}
        >
          确认并继续
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical">
        <Form.Item label="选择简历文件（支持 PDF / DOCX）">
          <Upload.Dragger {...uploadProps} disabled={uploading || parsing}>
            <p style={{ marginBottom: '8px' }}>
              <CloudUploadOutlined style={{ fontSize: '32px' }} />
            </p>
            <p>点击或拖拽文件到此区域上传</p>
            <p style={{ color: token.colorTextTertiary, fontSize: '12px' }}>
              支持 PDF、Word 格式，文件大小不超过 10MB
            </p>
          </Upload.Dragger>
        </Form.Item>

        {fileList.length > 0 && (
          <Form.Item
            label="简历标题（可选）"
            name="title"
            initialValue={fileList[0]?.name}
          >
            <Input
              placeholder="输入简历标题，如：Java 后端工程师简历"
              disabled={uploading || parsing}
            />
          </Form.Item>
        )}

        {fileList.length > 0 && !uploadedResume && (
          <Form.Item>
            <div
              style={{
                textAlign: 'center',
                color: token.colorTextSecondary,
                fontSize: '12px',
              }}
            >
              文件已选择，请等待上传完成或点击确认继续
            </div>
          </Form.Item>
        )}

        <Divider plain>或</Divider>

        <Form.Item label="直接粘贴简历内容" name="resumeText">
          <TextArea
            rows={6}
            placeholder="在此粘贴完整的简历内容，建议包含个人信息、教育背景和工作经历。"
            disabled={uploading || parsing}
          />
          <div
            style={{
              marginTop: 8,
              fontSize: 12,
              color: token.colorTextTertiary,
            }}
          >
            至少提供上传文件或粘贴文本中的一种方式。
          </div>
        </Form.Item>

        {uploading && (
          <Form.Item label="上传进度">
            <Progress
              percent={Math.round(uploadProgress)}
              status={uploadProgress === 100 ? 'success' : 'active'}
            />
          </Form.Item>
        )}

        {uploadedResume && !parseError && (
          <Form.Item>
            <Alert
              message="上传成功"
              description={`文件 "${uploadedResume.originalFilename}" 已上传`}
              type="success"
              icon={<CheckCircleOutlined />}
              showIcon
            />
          </Form.Item>
        )}

        {parseError && (
          <Form.Item>
            <Alert
              message="解析失败"
              description={parseError}
              type="error"
              icon={<ExclamationCircleOutlined />}
              showIcon
            />
          </Form.Item>
        )}

        {parsing && (
          <Form.Item label="解析状态">
            <Spin tip="正在解析简历内容..." />
          </Form.Item>
        )}

        {parsedData && !parsing && (
          <>
            <Divider>解析结果预览</Divider>

            {parsedData.markdown ? (
              <Form.Item label="简历解析结果 (Markdown)">
                <div
                  style={{
                    padding: '16px',
                    background: token.colorBgElevated,
                    borderRadius: '8px',
                    border: `1px solid ${token.colorBorder}`,
                    maxHeight: '400px',
                    overflowY: 'auto',
                    lineHeight: '1.6',
                  }}
                  className="markdown-content"
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {parsedData.markdown}
                  </ReactMarkdown>
                </div>
              </Form.Item>
            ) : (
              <>
                {parsedData.personalInfo && (
                  <Form.Item label="个人信息">
                    <div
                      style={{
                        padding: '12px',
                        background: token.colorBgElevated,
                        borderRadius: '4px',
                      }}
                    >
                      {parsedData.personalInfo.name && (
                        <div>
                          <strong>姓名:</strong> {parsedData.personalInfo.name}
                        </div>
                      )}
                      {parsedData.personalInfo.email && (
                        <div>
                          <strong>邮箱:</strong> {parsedData.personalInfo.email}
                        </div>
                      )}
                      {parsedData.personalInfo.phone && (
                        <div>
                          <strong>电话:</strong> {parsedData.personalInfo.phone}
                        </div>
                      )}
                      {parsedData.personalInfo.location && (
                        <div>
                          <strong>地点:</strong>{' '}
                          {parsedData.personalInfo.location}
                        </div>
                      )}
                    </div>
                  </Form.Item>
                )}

                {parsedData.skills && parsedData.skills.length > 0 && (
                  <Form.Item label="技能">
                    <div
                      style={{
                        padding: '12px',
                        background: token.colorBgElevated,
                        borderRadius: '4px',
                      }}
                    >
                      {parsedData.skills.slice(0, 5).map((skill, idx) => (
                        <span
                          key={idx}
                          style={{
                            display: 'inline-block',
                            marginRight: '8px',
                            marginBottom: '8px',
                            padding: '4px 8px',
                            background: token.colorPrimary,
                            color: 'white',
                            borderRadius: '4px',
                            fontSize: '12px',
                          }}
                        >
                          {skill}
                        </span>
                      ))}
                      {parsedData.skills.length > 5 && (
                        <span style={{ color: token.colorTextTertiary }}>
                          +{parsedData.skills.length - 5} 项技能
                        </span>
                      )}
                    </div>
                  </Form.Item>
                )}

                {parsedData.education && parsedData.education.length > 0 && (
                  <Form.Item label="教育背景">
                    <div
                      style={{
                        padding: '12px',
                        background: token.colorBgElevated,
                        borderRadius: '4px',
                      }}
                    >
                      {parsedData.education.slice(0, 2).map((edu, idx) => (
                        <div key={idx} style={{ marginBottom: '8px' }}>
                          <div>
                            <strong>{edu.institution}</strong>
                          </div>
                          <div style={{ color: token.colorTextSecondary }}>
                            {edu.degree} - {edu.field}
                          </div>
                        </div>
                      ))}
                      {parsedData.education.length > 2 && (
                        <div style={{ color: token.colorTextTertiary }}>
                          +{parsedData.education.length - 2} 项教育背景
                        </div>
                      )}
                    </div>
                  </Form.Item>
                )}

                {parsedData.experience && parsedData.experience.length > 0 && (
                  <Form.Item label="工作经历">
                    <div
                      style={{
                        padding: '12px',
                        background: token.colorBgElevated,
                        borderRadius: '4px',
                      }}
                    >
                      {parsedData.experience.slice(0, 2).map((exp, idx) => (
                        <div key={idx} style={{ marginBottom: '8px' }}>
                          <div>
                            <strong>{exp.position}</strong> @ {exp.company}
                          </div>
                          <div style={{ color: token.colorTextSecondary }}>
                            {exp.description[0]}
                          </div>
                        </div>
                      ))}
                      {parsedData.experience.length > 2 && (
                        <div style={{ color: token.colorTextTertiary }}>
                          +{parsedData.experience.length - 2} 项工作经历
                        </div>
                      )}
                    </div>
                  </Form.Item>
                )}
              </>
            )}
          </>
        )}
      </Form>
    </Modal>
  );
};

export default ResumeUploadDialog;
