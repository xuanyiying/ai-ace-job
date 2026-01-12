import React, { useState } from 'react';
import { PitchPerfectCard } from '../components/PitchPerfectCard';
import { ParsedResumeData } from '../types';
import './agents.css';

export const PitchPerfectPage: React.FC = () => {
  const [resumeData, setResumeData] = useState<ParsedResumeData | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [showForm, setShowForm] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (resumeData && jobDescription.trim()) {
      setShowForm(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>简历优化专家</h1>
        <p>
          基于目标职位深度优化您的个人简介和简历核心内容
        </p>
      </div>

      {showForm ? (
        <div className="form-container">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="resume">简历数据 (JSON):</label>
              <textarea
                id="resume"
                value={resumeData ? JSON.stringify(resumeData, null, 2) : ''}
                onChange={(e) => {
                  try {
                    setResumeData(JSON.parse(e.target.value));
                  } catch {
                    // Invalid JSON, ignore
                  }
                }}
                placeholder="粘贴您的简历数据 JSON"
                rows={8}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="jd">职位描述:</label>
              <textarea
                id="jd"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="粘贴职位描述内容"
                rows={6}
                required
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary">
                继续
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="content-container">
          {resumeData && jobDescription && (
            <PitchPerfectCard
              resumeData={resumeData}
              jobDescription={jobDescription}
            />
          )}
          <button onClick={() => setShowForm(true)} className="btn-secondary">
            ← 返回输入
          </button>
        </div>
      )}
    </div>
  );
};

export default PitchPerfectPage;
