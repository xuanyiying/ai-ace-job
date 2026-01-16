import React from 'react';
import { InfoCircleOutlined, CloudDownloadOutlined } from '@ant-design/icons';
import { Typography, Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { Resume, ParseStatus, Optimization } from '../../types';
import { ResumeDetailHeader, ResumeViewMode } from './ResumeDetailHeader';
import { ResumePersonalInfo } from './ResumePersonalInfo';
import { ResumeSummary } from './ResumeSummary';
import { ResumeEducation } from './ResumeEducation';
import { ResumeExperience } from './ResumeExperience';
import { ResumeProjects } from './ResumeProjects';
import { ResumeSkills } from './ResumeSkills';
import { ResumeLanguages } from './ResumeLanguages';
import { ResumeCertifications } from './ResumeCertifications';
import { ResumeAnalysisView } from './ResumeAnalysisView';
import { ResumeOptimizationView } from './ResumeOptimizationView';
import { ResumeHistoryView } from './ResumeHistoryView';

const { Paragraph, Text } = Typography;

interface ResumeDetailProps {
  resume: Resume;
  viewMode: ResumeViewMode;
  onViewChange: (view: ResumeViewMode) => void;
  onSetPrimary: () => void;
  // For History View
  optimizations?: Optimization[];
  onSelectOptimization?: (id: string) => void;
  // For Optimization View
  initialOptimizationId?: string;
  onOptimizationSuccess?: () => void;
}

export const ResumeDetail: React.FC<ResumeDetailProps> = ({
  resume,
  viewMode,
  onViewChange,
  onSetPrimary,
  optimizations = [],
  onSelectOptimization = () => {},
  initialOptimizationId,
  onOptimizationSuccess,
}) => {
  const { t } = useTranslation();

  const renderParsedContent = () => {
    if (resume.parseStatus === ParseStatus.COMPLETED && resume.parsedData) {
      return (
        <div className="animate-fade-in max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-6">
            <ResumePersonalInfo data={resume.parsedData.personalInfo} />
            <ResumeSummary summary={resume.parsedData.summary} />
            <ResumeEducation education={resume.parsedData.education} />
            <ResumeExperience experience={resume.parsedData.experience} />
            <ResumeProjects projects={resume.parsedData.projects} />
            <ResumeSkills skills={resume.parsedData.skills} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
              <ResumeLanguages languages={resume.parsedData.languages} />
              <ResumeCertifications
                certifications={resume.parsedData.certifications}
              />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="empty-state">
        <div className="empty-icon-wrapper">
          {resume.parseStatus === ParseStatus.PROCESSING ? (
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          ) : (
            <InfoCircleOutlined />
          )}
        </div>
        <div className="text-2xl font-bold mb-3">
          {resume.parseStatus === ParseStatus.PROCESSING
            ? t('resume.parsing_in_progress', '简历正在解析中...')
            : t('resume.no_parsed_data', '暂无结构化数据')}
        </div>
        <Paragraph className="text-secondary max-w-md">
          {resume.parseStatus === ParseStatus.PROCESSING
            ? '我们正在使用 AI 深度分析您的简历内容，提取关键信息并生成结构化视图。这通常需要几秒钟时间，请稍候。'
            : '未能成功提取结构化信息。请尝试重新上传清晰的 PDF 或 Word 文档。'}
        </Paragraph>
      </div>
    );
  };

  const renderContent = () => {
    switch (viewMode) {
      case 'detail':
        return renderParsedContent();
      case 'analysis':
        return <ResumeAnalysisView resumeId={resume.id} />;
      case 'optimization':
        return (
          <ResumeOptimizationView
            resumeId={resume.id}
            initialOptimizationId={initialOptimizationId}
            onSuccess={onOptimizationSuccess}
          />
        );
      case 'history':
        return (
          <ResumeHistoryView
            optimizations={optimizations}
            onSelectOptimization={onSelectOptimization}
          />
        );
      case 'preview':
        return (
          <div 
            className="bg-slate-50 rounded-xl overflow-hidden relative"
            style={{ minHeight: '800px', height: 'calc(100vh - 200px)' }}
          >
            {resume.fileUrl ? (
              <>
                 <div className="absolute top-4 right-4 z-10">
                    <Button
                      icon={<CloudDownloadOutlined />}
                      href={resume.fileUrl}
                      target="_blank"
                      type="primary"
                      className="shadow-lg"
                    >
                      {t('common.download', '下载原文')}
                    </Button>
                 </div>
                <iframe
                  src={resume.fileUrl}
                  className="w-full h-full border-none"
                  title="Resume Preview"
                />
              </>
            ) : (
              <div className="h-full flex items-center justify-center">
                <Text type="secondary" className="!text-gray-500">
                  {t('resume.preview_unavailable', '预览不可用')}
                </Text>
              </div>
            )}
          </div>
        );
      default:
        return renderParsedContent();
    }
  };

  return (
    <>
      <ResumeDetailHeader
        resume={resume}
        activeView={viewMode}
        onViewChange={onViewChange}
        onSetPrimary={onSetPrimary}
      />
      <div 
        key={viewMode} 
        className={`resume-detail-body mt-6 animate-fade-in ${viewMode === 'preview' ? '!p-0 !overflow-hidden' : ''}`}
        style={viewMode === 'preview' ? { padding: 0 } : undefined}
      >
        {renderContent()}
      </div>
    </>
  );
};
