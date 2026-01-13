import React, { useState, useEffect } from 'react';
import { PitchPerfectCard } from '../components/PitchPerfectCard';
import { useResumeStore } from '../stores';
import { ParsedResumeData } from '../types';
import { Alert, Button, Space, Tooltip } from 'antd';
import { FileTextOutlined, HighlightOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import './agents.css';

export const PitchPerfectPage: React.FC = () => {
  const { currentResume, fetchResumes } = useResumeStore();
  const [jobDescription, setJobDescription] = useState('');
  const [showForm, setShowForm] = useState(true);

  useEffect(() => {
    if (!currentResume) {
      fetchResumes();
    }
  }, [currentResume, fetchResumes]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentResume?.parsedData && jobDescription.trim()) {
      setShowForm(false);
    }
  };

  const resumeData = currentResume?.parsedData;

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-icon-wrapper">
          <HighlightOutlined className="header-icon" />
        </div>
        <h1>履历点睛</h1>
        <p>生成一段黄金自我介绍，让您在众多候选人中脱颖而出。</p>
      </div>

      {showForm ? (
        <div className="form-container">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>当前活跃简历:</label>
              {currentResume ? (
                <div className="active-resume-card">
                  <Space>
                    <FileTextOutlined className="resume-icon" />
                    <div className="resume-info">
                      <div className="resume-title">{currentResume.title || currentResume.originalFilename}</div>
                      <div className="resume-meta">v{currentResume.version} · 已解析</div>
                    </div>
                  </Space>
                  <Button type="link" className="change-btn" onClick={() => window.location.href = '/resumes'}>更换</Button>
                </div>
              ) : (
                <Alert
                  message="未找到活跃简历"
                  description="请先前往'我的简历'模块上传并解析简历。"
                  type="warning"
                  showIcon
                  action={
                    <Button size="small" type="primary" onClick={() => window.location.href = '/resumes'}>
                      去上传
                    </Button>
                  }
                />
              )}
            </div>

            <div className="form-group">
              <label htmlFor="jd">职位描述:</label>
              <textarea
                id="jd"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="粘贴职位描述内容"
                rows={10}
                required
              />
            </div>

            <div className="form-actions">
              <button 
                type="submit" 
                className="btn-primary" 
                disabled={!currentResume || currentResume.parseStatus !== 'COMPLETED'}
              >
                开始优化
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="content-container">
          {resumeData && jobDescription && currentResume && (
            <PitchPerfectCard
              resumeId={currentResume.id}
              resumeData={resumeData as any as ParsedResumeData}
              jobDescription={jobDescription}
              onBack={() => setShowForm(true)}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default PitchPerfectPage;
