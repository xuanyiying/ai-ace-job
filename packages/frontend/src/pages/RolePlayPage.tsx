import React, { useState } from 'react';
import { RolePlayCard } from '../components/RolePlayCard';
import { ParsedResumeData } from '../types';
import './agents.css';

export const RolePlayPage: React.FC = () => {
  const [resumeData, setResumeData] = useState<ParsedResumeData | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [showForm, setShowForm] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (jobDescription.trim()) {
      setShowForm(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>模拟面试</h1>
        <p>AI 面试官实时互动，模拟真实面试场景并提供即时反馈</p>
      </div>

      {showForm ? (
        <div className="form-container">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="resume">简历数据 (JSON) - 可选:</label>
              <textarea
                id="resume"
                value={resumeData ? JSON.stringify(resumeData, null, 2) : ''}
                onChange={(e) => {
                  try {
                    if (e.target.value.trim()) {
                      setResumeData(JSON.parse(e.target.value));
                    } else {
                      setResumeData(null);
                    }
                  } catch {
                    // Invalid JSON, ignore
                  }
                }}
                placeholder="粘贴您的简历数据 JSON（可选）"
                rows={6}
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
          {jobDescription && (
            <RolePlayCard
              resumeData={resumeData || undefined}
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

export default RolePlayPage;
