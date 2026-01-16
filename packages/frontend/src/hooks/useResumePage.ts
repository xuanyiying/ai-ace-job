import { useState, useEffect } from 'react';
import { message, Modal } from 'antd';
import { useTranslation } from 'react-i18next';
import { useResumeStore } from '../stores';
import { resumeService } from '../services/resume-service';
import { optimizationService } from '../services/optimization-service';
import { Resume, Optimization, ParseStatus } from '../types';

export const useResumePage = () => {
  const { t } = useTranslation();
  const {
    resumes,
    fetchResumes,
    setPrimary,
    currentResume,
    setCurrentResume,
    addResume,
    removeResume,
  } = useResumeStore();

  const [state, setState] = useState({
    previewVisible: false,
    uploading: false,
    optimizationVisible: false,
    historyVisible: false,
    analysisVisible: false,
  });

  const [data, setData] = useState({
    selectedPreviewResume: null as Resume | null,
    optimizations: [] as Optimization[],
    selectedOptimizationId: undefined as string | undefined,
    selectedAnalysisResumeId: null as string | null,
  });

  useEffect(() => {
    fetchResumes();
    const pollInterval = setInterval(() => {
      const hasProcessing = resumes.some(
        (r) => r.parseStatus === ParseStatus.PROCESSING
      );
      if (hasProcessing) fetchResumes();
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
      const filtered = all.filter((opt) => opt.resumeId === resumeId);
      setData((prev) => ({
        ...prev,
        optimizations: filtered.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
      }));
    } catch (error) {
      console.error('Failed to fetch optimizations:', error);
    }
  };

  const handleUpload = async (file: File) => {
    try {
      setState((prev) => ({ ...prev, uploading: true }));
      const newResume = await resumeService.uploadResume(file);
      addResume(newResume);
      setCurrentResume(newResume);
      message.success(t('resume.upload_success', '简历上传成功，开始解析...'));
      resumeService.parseResume(newResume.id).then(fetchResumes);
    } catch (error) {
      message.error(t('resume.upload_failed', '上传失败'));
    } finally {
      setState((prev) => ({ ...prev, uploading: false }));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await resumeService.deleteResume(id);
      removeResume(id);
      message.success(t('resume.delete_success', '简历已删除'));
    } catch (error) {
      message.error(t('resume.delete_failed', '删除失败'));
    }
  };

  const handleDeleteWithConfirm = (id: string, title: string) => {
    Modal.confirm({
      title: t('resume.delete_confirm_title', '确定要删除这份简历吗？'),
      content: `${t('resume.delete_confirm_content', '删除后将无法找回：')}${title}`,
      okText: t('common.delete', '删除'),
      okType: 'danger',
      cancelText: t('common.cancel', '取消'),
      onOk: () => handleDelete(id),
    });
  };

  const handleSetPrimary = async (id: string) => {
    try {
      await setPrimary(id);
      message.success(t('resume.set_primary_success', '已设置为当前活跃简历'));
    } catch (error) {
      message.error(t('resume.set_primary_failed', '设置失败'));
    }
  };

  return {
    t,
    resumes,
    currentResume,
    setCurrentResume,
    state,
    setState,
    data,
    setData,
    fetchResumes,
    handleUpload,
    handleDelete,
    handleDeleteWithConfirm,
    handleSetPrimary,
  };
};
