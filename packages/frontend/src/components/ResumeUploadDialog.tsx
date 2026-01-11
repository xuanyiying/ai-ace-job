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
  FileTextOutlined,
  PaperClipOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { UploadProps, UploadFile } from 'antd';
import { resumeService } from '../services/resume-service';
import { theme } from 'antd';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ParseStatus, ParsedResumeData } from '../types';

interface ResumeUploadDialogProps {
  visible: boolean;
  onClose: () => void;
  onUploadSuccess: (resumeData: any) => void;
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
  const [parseProgress, setParseProgress] = useState(0);
  const [uploadedResume, setUploadedResume] = useState<any>(null);
  const [parsedData, setParsedData] = useState<ParsedResumeData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleConfirm = async () => {
    const resumeText: string = form.getFieldValue('resumeText');
    const hasText = !!resumeText && resumeText.trim().length > 0;
    const title = form.getFieldValue('title');

    let finalResume = uploadedResume;
    let finalParsedData = parsedData;

    let uploadInterval: any;
    let parseInterval: any;
    let pollInterval: any;

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

        uploadInterval = setInterval(() => {
          setUploadProgress((prev) => (prev >= 95 ? 95 : prev + 5));
        }, 100);

        finalResume = await resumeService.uploadResume(
          renamedFile,
          title || originalName
        );
        clearInterval(uploadInterval);
        setUploadProgress(100);
        setUploadedResume(finalResume);

        message.success('文件上传成功，正在解析...');

        setParsing(true);
        setParseProgress(0);

        // Simulate parsing progress
        parseInterval = setInterval(() => {
          setParseProgress((prev) => (prev >= 90 ? 90 : prev + 10));
        }, 300);

        const parseResponse = (await resumeService.parseResume(
          finalResume.id
        )) as any;
        clearInterval(parseInterval);

        if (parseResponse.parseStatus === ParseStatus.PROCESSING) {
          setParsedData({
            extractedText: parseResponse.extractedText,
          });
          message.info('简历内容已提取，正在进行深度解析...');

          // Start polling for completion
          pollInterval = setInterval(async () => {
            try {
              const currentResume = await resumeService.getResume(
                finalResume.id
              );
              const status = currentResume.parseStatus;
              if (status === ParseStatus.COMPLETED) {
                clearInterval(pollInterval);
                setParseProgress(100);
                setParsing(false);
                setParsedData(currentResume.parsedData as ParsedResumeData);
                message.success('简历解析完成');
              } else if (status === ParseStatus.FAILED) {
                clearInterval(pollInterval);
                setParsing(false);
                message.error('简历解析失败');
              }
            } catch (pollError) {
              console.error('Polling error:', pollError);
            }
          }, 3000);
          return; // Don't close modal yet
        } else {
          setParseProgress(100);
          setParsedData(parseResponse);
          message.success('简历解析完成');
        }
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
      if (uploadInterval) clearInterval(uploadInterval);
      if (parseInterval) clearInterval(parseInterval);
      if (pollInterval && !parsing) clearInterval(pollInterval);
      setUploading(false);
      if (!pollInterval) setParsing(false);
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
        {!parsedData && (
          <Form.Item label="选择简历文件（支持 PDF / DOCX）">
            {fileList.length === 0 ? (
              <Upload.Dragger {...uploadProps} disabled={uploading || parsing}>
                <p style={{ marginBottom: '8px' }}>
                  <CloudUploadOutlined style={{ fontSize: '32px' }} />
                </p>
                <p>点击或拖拽文件到此区域上传</p>
                <p style={{ color: token.colorTextTertiary, fontSize: '12px' }}>
                  支持 PDF、Word 格式，文件大小不超过 10MB
                </p>
              </Upload.Dragger>
            ) : (
              <div
                style={{
                  padding: '16px',
                  background: token.colorBgContainer,
                  borderRadius: '8px',
                  border: `1px dashed ${token.colorBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      background: token.colorPrimaryBg,
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: token.colorPrimary,
                    }}
                  >
                    <FileTextOutlined style={{ fontSize: '20px' }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 500 }}>{fileList[0].name}</div>
                    <div style={{ fontSize: '12px', color: token.colorTextSecondary }}>
                      {(fileList[0].size! / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                </div>
                {!uploading && !parsing && !uploadedResume && (
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => setFileList([])}
                  />
                )}
                {(uploading || parsing) && (
                  <div style={{ color: token.colorPrimary }}>
                    <Spin size="small" />
                  </div>
                )}
                {uploadedResume && !parsing && !parsedData && (
                  <CheckCircleOutlined style={{ color: token.colorSuccess, fontSize: '20px' }} />
                )}
              </div>
            )}
          </Form.Item>
        )}

        {fileList.length > 0 && !parsedData && (
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

        {fileList.length === 0 && !parsedData && (
          <>
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
          </>
        )}

        {uploading && (
          <Form.Item label="上传进度">
            <Progress
              percent={Math.round(uploadProgress)}
              status={uploadProgress === 100 ? 'success' : 'active'}
              strokeColor={token.colorPrimary}
            />
          </Form.Item>
        )}

        {parsing && (
          <Form.Item label="解析进度">
            <Progress
              percent={Math.round(parseProgress)}
              status={parseProgress === 100 ? 'success' : 'active'}
              strokeColor={token.colorInfo}
            />
          </Form.Item>
        )}

        {parsedData && (
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
            ) : parsedData.personalInfo ? (
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
            ) : parsedData.extractedText ? (
              <Form.Item label="提取的文本内容（深度解析中...）">
                <TextArea
                  rows={12}
                  value={parsedData.extractedText}
                  readOnly
                  style={{
                    background: token.colorBgContainer,
                    fontFamily: 'monospace',
                    fontSize: '12px',
                  }}
                />
              </Form.Item>
            ) : null}
          </>
        )}
      </Form>
    </Modal>
  );
};

export default ResumeUploadDialog;
