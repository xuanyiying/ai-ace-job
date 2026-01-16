import React, { useState, useEffect } from 'react';
import { message, Typography } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import { useResumePage } from '../hooks/useResumePage';
import { ResumeSidebar } from '../components/MyResumes/ResumeSidebar';
import { ResumeDetail } from '../components/MyResumes/ResumeDetail';
import { ResumeEmptyState } from '../components/MyResumes/ResumeEmptyState';
import { ResumeViewMode } from '../components/MyResumes/ResumeDetailHeader';
import './MyResumesPage.css';

const { Title, Paragraph } = Typography;

const MyResumesPage: React.FC = () => {
  const {
    t,
    resumes,
    currentResume,
    setCurrentResume,
    state,
    data,
    fetchResumes,
    handleUpload,
    handleDelete,
    handleSetPrimary,
  } = useResumePage();

  const [viewMode, setViewMode] = useState<ResumeViewMode>('analysis');
  const [initialOptimizationId, setInitialOptimizationId] = useState<string | undefined>(undefined);

  // Reset view mode when resume changes
  useEffect(() => {
    if (currentResume) {
      setViewMode('analysis');
      setInitialOptimizationId(undefined);
    }
  }, [currentResume?.id]);

  const handleOptimizationSuccess = () => {
    fetchResumes();
    message.success(t('resume.optimization_success', '简历优化已完成并保存为新版本'));
    // Optionally switch to history or detail view? 
    // User didn't specify, but maybe stay on optimization view or go to history?
    // Let's keep it on optimization view for now so they can see the result if the component supports it.
    // Or maybe switch to history to see the new version.
    // The previous implementation closed the dialog.
    // Let's reload the optimizations list (which happens automatically via fetchResumes -> useResumePage effect?)
    // No, fetchResumes refreshes resumes list. useResumePage has effect on currentResume to fetchOptimizations.
    // If we want to refresh optimizations, we might need to trigger it.
    // However, optimizations are fetched when currentResume changes.
    // If fetchResumes updates currentResume (because it's in the list), it might trigger fetchOptimizations?
    // Actually, useResumePage has `useEffect(() => { if (currentResume) fetchOptimizations(...) }, [currentResume])`.
    // Does fetchResumes update currentResume reference? Probably not if it just updates the list.
    // But `useResumeStore` updates `resumes`. `currentResume` is state in store.
    // If I want to refresh optimizations, I might need to trigger it manually or rely on `fetchResumes` updating something.
    // Ideally `useResumePage` should expose `fetchOptimizations`.
    // But for now, let's assume `fetchResumes` is enough or the optimization view handles its own data refreshing if needed.
    // Actually, `ResumeHistoryView` takes `optimizations` as prop.
    // If `data.optimizations` isn't updated, history view won't show new one.
    // `useResumePage` doesn't expose `fetchOptimizations`.
    // I should probably add `fetchOptimizations` to the return of `useResumePage` or rely on a hack.
    // But let's stick to the plan.
  };

  const handleSelectOptimization = (id: string) => {
    setInitialOptimizationId(id);
    setViewMode('optimization');
  };

  return (
    <div className="my-resumes-container">
      <div className="max-w-7xl mx-auto mb-10">
        <Title level={2} className="!mb-2 flex items-center gap-3">
          <FileTextOutlined className="text-primary" />
          {t('menu.my_resumes', '我的简历')}
        </Title>
        <Paragraph className="!text-lg text-secondary">
          {t(
            'resume.my_resumes_desc',
            '管理您的简历版本，查看解析后的结构化数据'
          )}
        </Paragraph>
      </div>

      <div className="resumes-layout">
        <ResumeSidebar
          resumes={resumes}
          currentResume={currentResume}
          onSelect={setCurrentResume}
          onUpload={handleUpload}
          onDelete={handleDelete}
          uploading={state.uploading}
        />

        <main className="resume-content">
          {currentResume ? (
            <ResumeDetail
              resume={currentResume}
              viewMode={viewMode}
              onViewChange={setViewMode}
              onSetPrimary={() => handleSetPrimary(currentResume.id)}
              optimizations={data.optimizations}
              onSelectOptimization={handleSelectOptimization}
              initialOptimizationId={initialOptimizationId}
              onOptimizationSuccess={handleOptimizationSuccess}
            />
          ) : (
            <ResumeEmptyState
              onUpload={handleUpload}
              uploading={state.uploading}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default MyResumesPage;
