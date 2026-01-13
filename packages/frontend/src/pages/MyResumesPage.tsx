import React, { useEffect, useState } from 'react';
import {
  Avatar,
  Button,
  Tag,
  Typography,
  Space,
  Empty,
  Modal,
  message,
  Upload,
} from 'antd';
import {
  FileTextOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  HistoryOutlined,
  CloudDownloadOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  ReadOutlined,
  ProjectOutlined,
  ProfileOutlined,
  GlobalOutlined,
  SafetyCertificateOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useResumeStore } from '../stores';
import { ParseStatus, Resume, Optimization } from '../types';
import { resumeService } from '../services/resume-service';
import { optimizationService } from '../services/optimization-service';
import { ResumeOptimizationDialog } from '../components/ResumeOptimizationDialog';
import './MyResumesPage.css';

const { Title, Text, Paragraph } = Typography;

const MyResumesPage: React.FC = () => {
  const { t } = useTranslation();
  const { resumes, fetchResumes, setPrimary, currentResume, setCurrentResume, addResume, removeResume } = useResumeStore();
  const [previewVisible, setPreviewVisible] = useState(false);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [uploading, setUploading] = useState(false);
  const [optimizationVisible, setOptimizationVisible] = useState(false);
  const [optimizations, setOptimizations] = useState<Optimization[]>([]);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [selectedOptimizationId, setSelectedOptimizationId] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetchResumes();
    
    // Set up polling for processing resumes
    const pollInterval = setInterval(() => {
      const hasProcessing = resumes.some(r => r.parseStatus === ParseStatus.PROCESSING);
      if (hasProcessing) {
        fetchResumes();
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [fetchResumes, resumes]);

  useEffect(() => {
    if (currentResume) {
      fetchOptimizations(currentResume.id);
    }
  }, [currentResume]);

  const fetchOptimizations = async (resumeId: string) => {
    try {
      const all = await optimizationService.listOptimizations();
      const filtered = all.filter((opt: Optimization) => opt.resumeId === resumeId);
      setOptimizations(filtered.sort((a: Optimization, b: Optimization) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    } catch (error) {
      console.error('Failed to fetch optimizations:', error);
    }
  };

  const handlePreview = (resume: Resume) => {
    setSelectedResume(resume);
    setPreviewVisible(true);
  };

  const handleSetPrimary = async (id: string) => {
    try {
      await setPrimary(id);
      message.success(t('resume.set_primary_success', '已设置为当前活跃简历'));
    } catch (error) {
      message.error(t('resume.set_primary_failed', '设置失败'));
    }
  };

  const handleDelete = (id: string, title: string) => {
    Modal.confirm({
      title: t('resume.delete_confirm_title', '确定要删除这份简历吗？'),
      icon: <ExclamationCircleOutlined className="text-error" />,
      content: `${t('resume.delete_confirm_content', '删除后将无法找回：')}${title}`,
      okText: t('common.delete', '删除'),
      okType: 'danger',
      cancelText: t('common.cancel', '取消'),
      onOk: async () => {
        try {
          await resumeService.deleteResume(id);
          removeResume(id);
          message.success(t('resume.delete_success', '简历已删除'));
        } catch (error) {
          message.error(t('resume.delete_failed', '删除失败'));
        }
      },
    });
  };

  const handleUpload = async (file: File) => {
    try {
      setUploading(true);
      const newResume = await resumeService.uploadResume(file);
      addResume(newResume);
      setCurrentResume(newResume);
      message.success(t('resume.upload_success', '简历上传成功，开始解析...'));
      
      // Auto trigger parse
      resumeService.parseResume(newResume.id).then(() => {
        fetchResumes(); // Refresh to get parsed data
      });
    } catch (error) {
      message.error(t('resume.upload_failed', '上传失败'));
    } finally {
      setUploading(false);
    }
  };

  const getStatusTag = (status: ParseStatus) => {
    switch (status) {
      case ParseStatus.COMPLETED:
        return <Tag color="success">{t('resume.status_completed', '已解析')}</Tag>;
      case ParseStatus.PROCESSING:
        return <Tag color="processing">{t('resume.status_processing', '解析中')}</Tag>;
      case ParseStatus.FAILED:
        return <Tag color="error">{t('resume.status_failed', '解析失败')}</Tag>;
      default:
        return <Tag color="default">{t('resume.status_pending', '待处理')}</Tag>;
    }
  };

  return (
    <div className="my-resumes-container">
      <div className="max-w-7xl mx-auto mb-10">
        <Title level={2} className="!mb-2 flex items-center gap-3">
          <FileTextOutlined className="text-primary" />
          {t('menu.my_resumes', '我的简历')}
        </Title>
        <Paragraph className="!text-lg text-secondary">
          {t('resume.my_resumes_desc', '管理您的简历版本，查看解析后的结构化数据')}
        </Paragraph>
      </div>

      <div className="resumes-layout">
        {/* Sidebar */}
        <aside className="resume-sidebar">
          <div className="resume-list-card">
            <div className="resume-list-header">
              <span className="font-medium">{t('resume.list_title', '简历记录')}</span>
              <Upload
                beforeUpload={(file) => {
                  handleUpload(file);
                  return false;
                }}
                showUploadList={false}
                accept=".pdf,.doc,.docx"
              >
                <Button 
                  type="primary" 
                  shape="circle" 
                  icon={<PlusOutlined />} 
                  loading={uploading}
                  className="shadow-lg shadow-primary/20"
                />
              </Upload>
            </div>

            <div className="py-4 max-h-[600px] overflow-y-auto custom-scrollbar">
              {!resumes || resumes.length === 0 ? (
                <div className="px-6 py-10 text-center opacity-40">
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('resume.no_resumes', '暂无简历')} />
                </div>
              ) : (
                resumes.map((item: Resume) => (
                  <div
                    key={item.id}
                    className={`resume-item ${item.id === currentResume?.id ? 'active' : ''}`}
                    onClick={() => setCurrentResume(item)}
                  >
                    <div className="resume-item-icon">
                      <FileTextOutlined />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium truncate pr-2">
                          {item.title || item.originalFilename}
                        </span>
                        {item.isPrimary && (
                          <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]" title="Active" />
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">v{item.version} · {new Date(item.createdAt).toLocaleDateString()}</span>
                        {getStatusTag(item.parseStatus)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="resume-content">
          {currentResume ? (
            <>
              <div className="resume-detail-header">
                <div className="flex justify-between items-start flex-wrap gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl font-bold m-0">
                        {currentResume.title || currentResume.originalFilename}
                      </h2>
                      <Tag className="glass-tag text-secondary">v{currentResume.version}</Tag>
                    </div>
                    <Space className="text-secondary">
                      <HistoryOutlined />
                      <span>上次更新: {new Date(currentResume.createdAt).toLocaleString()}</span>
                    </Space>
                  </div>
                  <Space size="middle">
                    <Button 
                      icon={<EyeOutlined />}
                      onClick={() => handlePreview(currentResume)}
                      className="glass-button"
                    >
                      预览原文
                    </Button>
                    <Button 
                      icon={<HistoryOutlined />}
                      onClick={() => setHistoryVisible(true)}
                      className="glass-button"
                    >
                      {t('resume.optimization_history', '优化历史')}
                    </Button>
                    {currentResume.parseStatus === ParseStatus.COMPLETED && (
                      <Button
                        type="primary"
                        icon={<RocketOutlined />}
                        onClick={() => setOptimizationVisible(true)}
                        className="bg-gradient-to-r from-primary to-blue-600 border-none shadow-lg shadow-primary/20"
                      >
                        {t('resume.optimize', '优化简历')}
                      </Button>
                    )}
                    {!currentResume.isPrimary && (
                      <Button 
                        type="primary" 
                        onClick={() => handleSetPrimary(currentResume.id)}
                        className="shadow-lg shadow-primary/20"
                      >
                        {t('resume.set_as_active', '设为当前活跃')}
                      </Button>
                    )}
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDelete(currentResume.id, currentResume.title || currentResume.originalFilename || '')}
                      className="glass-button !border-red-500/30 !text-red-500 hover:!bg-red-500/10"
                    >
                      {t('common.delete', '删除')}
                    </Button>
                  </Space>
                </div>
              </div>

              <div className="resume-detail-body">
                {currentResume.parseStatus === ParseStatus.COMPLETED && currentResume.parsedData ? (
                  <div className="animate-fade-in">
                    {/* Personal Info */}
                    <section className="data-section">
                      <div className="section-title">
                        <Avatar icon={<InfoCircleOutlined />} className="section-avatar bg-primary" />
                        {t('resume.personal_info', '个人信息')}
                      </div>
                      <div className="info-grid">
                        <div className="info-card">
                          <div className="info-card-icon"><UserOutlined /></div>
                          <div className="info-card-content">
                            <div className="info-label">{t('resume.name', '姓名')}</div>
                            <div className="info-value">{currentResume.parsedData.personalInfo?.name || '-'}</div>
                          </div>
                        </div>
                        <div className="info-card">
                          <div className="info-card-icon"><MailOutlined /></div>
                          <div className="info-card-content">
                            <div className="info-label">{t('resume.email', '邮箱')}</div>
                            <div className="info-value">{currentResume.parsedData.personalInfo?.email || '-'}</div>
                          </div>
                        </div>
                        <div className="info-card">
                          <div className="info-card-icon"><PhoneOutlined /></div>
                          <div className="info-card-content">
                            <div className="info-label">{t('resume.phone', '电话')}</div>
                            <div className="info-value">{currentResume.parsedData.personalInfo?.phone || '-'}</div>
                          </div>
                        </div>
                        <div className="info-card">
                          <div className="info-card-icon"><EnvironmentOutlined /></div>
                          <div className="info-card-content">
                            <div className="info-label">{t('resume.location', '地点')}</div>
                            <div className="info-value">{currentResume.parsedData.personalInfo?.location || '-'}</div>
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* Summary */}
                    {currentResume.parsedData.summary && (
                      <section className="data-section">
                        <div className="section-title">
                          <Avatar icon={<ProfileOutlined />} className="section-avatar bg-blue-500" />
                          {t('resume.summary', '专业总结')}
                        </div>
                        <div className="summary-content">
                          <Paragraph className="text-secondary leading-relaxed italic">
                            "{currentResume.parsedData.summary}"
                          </Paragraph>
                        </div>
                      </section>
                    )}

                    {/* Education */}
                    {currentResume.parsedData.education && currentResume.parsedData.education.length > 0 && (
                      <section className="data-section">
                        <div className="section-title">
                          <Avatar icon={<ReadOutlined />} className="section-avatar bg-purple-500" />
                          {t('resume.education', '教育背景')}
                        </div>
                        <div className="education-list">
                          {currentResume.parsedData.education.map((edu, idx) => (
                            <div key={idx} className="education-item mb-6 last:mb-0">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <div className="text-lg font-bold text-primary">{edu.institution}</div>
                                  <div className="text-secondary font-medium">{edu.degree} · {edu.field}</div>
                                </div>
                                <div className="text-tertiary text-sm">
                                  {edu.startDate} - {edu.endDate || t('common.present', '至今')}
                                </div>
                              </div>
                              {edu.achievements && edu.achievements.length > 0 && (
                                <ul className="achievement-list mt-2">
                                  {edu.achievements.map((ach, i) => (
                                    <li key={i} className="text-secondary text-sm mb-1">{ach}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Experience */}
                    <section className="data-section">
                      <div className="section-title">
                        <Avatar icon={<HistoryOutlined />} className="section-avatar bg-amber-500" />
                        {t('resume.experience', '工作经验')}
                      </div>
                      <div className="experience-timeline">
                        {currentResume.parsedData.experience?.map((exp, idx) => (
                          <div key={idx} className="experience-item">
                            <div className="experience-header">
                              <div>
                                <div className="experience-company font-bold">{exp.company}</div>
                                <div className="text-primary font-medium">{exp.position}</div>
                              </div>
                              <div className="experience-date">
                                {exp.startDate} - {exp.endDate || t('common.present', '至今')}
                              </div>
                            </div>
                            <ul className="experience-description">
                              {exp.description?.map((desc: string, i: number) => (
                                <li key={i}>{desc}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Projects */}
                    {currentResume.parsedData.projects && currentResume.parsedData.projects.length > 0 && (
                      <section className="data-section">
                        <div className="section-title">
                          <Avatar icon={<ProjectOutlined />} className="section-avatar bg-indigo-500" />
                          {t('resume.projects', '项目经验')}
                        </div>
                        <div className="project-list">
                          {currentResume.parsedData.projects.map((project, idx) => (
                            <div key={idx} className="project-item mb-8 last:mb-0">
                              <div className="flex justify-between items-start mb-2">
                                <div className="text-lg font-bold text-primary">{project.name}</div>
                                <div className="text-tertiary text-sm">
                                  {project.startDate} - {project.endDate || t('common.present', '至今')}
                                </div>
                              </div>
                              <div className="text-secondary mb-3 leading-relaxed">{project.description}</div>
                              {project.highlights && project.highlights.length > 0 && (
                                <ul className="experience-description">
                                  {project.highlights.map((highlight, i) => (
                                    <li key={i}>{highlight}</li>
                                  ))}
                                </ul>
                              )}
                              {project.technologies && project.technologies.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-4">
                                  {project.technologies.map((tech, i) => (
                                    <Tag key={i} className="m-0 border-none bg-primary/10 text-primary rounded-md px-2 py-0.5 text-xs">
                                      {tech}
                                    </Tag>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Skills */}
                    <section className="data-section">
                      <div className="section-title">
                        <Avatar icon={<CheckCircleOutlined />} className="section-avatar bg-emerald-500" />
                        {t('resume.skills', '技能清单')}
                      </div>
                      <div className="skills-container">
                        {currentResume.parsedData.skills?.map((skill: any, idx: number) => {
                          if (typeof skill === 'string') {
                            return (
                              <div key={idx} className="skill-tag">
                                {skill}
                              </div>
                            );
                          }
                          if (typeof skill === 'object' && skill !== null) {
                            return (
                              <div key={idx} className="skill-category-group">
                                {skill.category && <div className="skill-category-name">{skill.category}</div>}
                                <div className="skill-category-items">
                                  {skill.items?.map((item: string, i: number) => (
                                    <div key={i} className="skill-tag">
                                      {item}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    </section>

                    {/* Languages & Certifications */}
                    <div className="info-grid mt-8">
                      {currentResume.parsedData.languages && currentResume.parsedData.languages.length > 0 && (
                        <section className="data-section mb-0">
                          <div className="section-title">
                            <Avatar icon={<GlobalOutlined />} className="section-avatar bg-blue-400" />
                            {t('resume.languages', '语言能力')}
                          </div>
                          <div className="flex flex-wrap gap-3">
                            {currentResume.parsedData.languages.map((lang, idx) => (
                              <Tag key={idx} className="m-0 border-none bg-blue-400/10 text-blue-500 rounded-lg px-3 py-1 font-medium">
                                {lang.name} {lang.proficiency && `· ${lang.proficiency}`}
                              </Tag>
                            ))}
                          </div>
                        </section>
                      )}

                      {currentResume.parsedData.certifications && currentResume.parsedData.certifications.length > 0 && (
                        <section className="data-section mb-0">
                          <div className="section-title">
                            <Avatar icon={<SafetyCertificateOutlined />} className="section-avatar bg-orange-400" />
                            {t('resume.certifications', '资格证书')}
                          </div>
                          <div className="flex flex-wrap gap-3">
                            {currentResume.parsedData.certifications.map((cert: any, idx: number) => (
                              <Tag key={idx} className="m-0 border-none bg-orange-400/10 text-orange-500 rounded-lg px-3 py-1 font-medium">
                                {typeof cert === 'string' ? cert : cert.name}
                              </Tag>
                            ))}
                          </div>
                        </section>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon-wrapper">
                      {currentResume.parseStatus === ParseStatus.PROCESSING ? (
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
                      ) : (
                        <InfoCircleOutlined />
                      )}
                    </div>
                    <div className="text-2xl font-bold mb-3">
                      {currentResume.parseStatus === ParseStatus.PROCESSING 
                        ? t('resume.parsing_in_progress', '简历正在解析中...')
                        : t('resume.no_parsed_data', '暂无结构化数据')}
                    </div>
                    <Paragraph className="text-secondary max-w-md">
                      {currentResume.parseStatus === ParseStatus.PROCESSING 
                        ? '我们正在使用 AI 深度分析您的简历内容，提取关键信息并生成结构化视图。这通常需要几秒钟时间，请稍候。'
                        : '未能成功提取结构化信息。请尝试重新上传清晰的 PDF 或 Word 文档。'}
                    </Paragraph>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="empty-state min-h-[600px]">
              <div className="empty-icon-wrapper">
                <FileTextOutlined />
              </div>
              <div className="text-2xl font-bold mb-3">请选择或上传简历</div>
              <Paragraph className="text-secondary max-w-xs">
                选择左侧简历版本查看解析后的结构化详情，或点击上方加号按钮上传您的最新简历。
              </Paragraph>
              <Upload
                beforeUpload={(file) => {
                  handleUpload(file);
                  return false;
                }}
                showUploadList={false}
                accept=".pdf,.doc,.docx"
              >
                <Button 
                  type="primary" 
                  size="large"
                  icon={<PlusOutlined />} 
                  loading={uploading}
                  className="mt-6 px-8 h-12 rounded-xl shadow-lg shadow-primary/20"
                >
                  上传新简历
                </Button>
              </Upload>
            </div>
          )}
        </main>
      </div>

      <ResumeOptimizationDialog
        visible={optimizationVisible}
        resumeId={currentResume?.id || ''}
        initialOptimizationId={selectedOptimizationId}
        onClose={() => {
          setOptimizationVisible(false);
          setSelectedOptimizationId(undefined);
        }}
        onSuccess={() => {
          setOptimizationVisible(false);
          setSelectedOptimizationId(undefined);
          fetchResumes();
          message.success(t('resume.optimization_success', '简历优化已完成并保存为新版本'));
        }}
      />

      <Modal
        title={
          <Space>
            <HistoryOutlined className="text-primary" />
            <span>{t('resume.optimization_history', '优化历史')}</span>
          </Space>
        }
        open={historyVisible}
        onCancel={() => setHistoryVisible(false)}
        footer={null}
        width={700}
        className="history-modal"
      >
        <div className="py-2">
          {!optimizations || optimizations.length === 0 ? (
            <Empty description={t('resume.no_history', '暂无优化记录')} />
          ) : (
            <div className="history-list max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
              {optimizations.map((opt) => (
                <div key={opt.id} className="history-item p-4 mb-4 rounded-xl border border-solid hover:border-primary/30 transition-all group">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-bold text-primary mb-1 flex items-center gap-2">
                        <RocketOutlined className="text-primary text-xs" />
                        {opt.job?.title || 'Target Position'}
                      </div>
                      <div className="text-xs text-secondary">
                        {new Date(opt.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <Tag color={opt.status === 'COMPLETED' ? 'success' : 'processing'}>
                      {opt.status === 'COMPLETED' ? t('common.completed') : t('common.processing')}
                    </Tag>
                  </div>
                  <div className="flex justify-between items-center mt-3">
                    <div className="text-xs text-tertiary">
                      {opt.suggestions?.length || 0} {t('resume.suggestions_count', '个优化建议')}
                    </div>
                    <Button 
                      type="link" 
                      size="small" 
                      onClick={() => {
                        setSelectedOptimizationId(opt.id);
                        setOptimizationVisible(true);
                        setHistoryVisible(false);
                      }}
                    >
                      查看详情
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal
        title={
          <Space>
            <FileTextOutlined />
            <span>{selectedResume?.originalFilename}</span>
          </Space>
        }
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={[
          <Button 
            key="download" 
            icon={<CloudDownloadOutlined />} 
            href={selectedResume?.fileUrl || '#'} 
            target="_blank" 
            type="primary"
            disabled={!selectedResume?.fileUrl}
            className="rounded-lg"
          >
            {t('common.download', '下载原文')}
          </Button>,
          <Button key="close" onClick={() => setPreviewVisible(false)} className="rounded-lg">
            {t('common.close', '关闭')}
          </Button>
        ]}
        width="95vw"
        centered
        styles={{ 
          body: { padding: 0, height: '88vh' },
          mask: { backdropFilter: 'blur(8px)' },
        }}
        className="full-screen-modal"
      >
        <div className="bg-gray-800 h-full overflow-hidden">
          {selectedResume?.fileUrl ? (
            <iframe 
              src={selectedResume.fileUrl} 
              className="w-full h-full border-none"
              title="Resume Preview"
            />
          ) : (
            <div className="h-[50vh] flex items-center justify-center">
              <Text type="secondary" className="!text-gray-500">{t('resume.preview_unavailable', '预览不可用')}</Text>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default MyResumesPage;
