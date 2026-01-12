import React, { useState } from 'react';
import { pitchPerfectService, type PitchPerfectAgentOutput } from '../services';
import { type ParsedResumeData } from '../types';
import './PitchPerfectCard.css';

interface PitchPerfectCardProps {
  resumeData: ParsedResumeData;
  jobDescription: string;
}

export const PitchPerfectCard: React.FC<PitchPerfectCardProps> = ({
  resumeData,
  jobDescription,
}) => {
  const [style, setStyle] = useState<'technical' | 'managerial' | 'sales'>(
    'technical'
  );
  const [duration, setDuration] = useState<30 | 60>(30);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PitchPerfectAgentOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [refining, setRefining] = useState(false);

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await pitchPerfectService.generatePitch(
        resumeData,
        jobDescription,
        style,
        duration
      );
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate pitch');
    } finally {
      setLoading(false);
    }
  };

  const handleRefine = async () => {
    if (!result || !feedback.trim()) {
      setError('Please provide feedback for refinement');
      return;
    }

    try {
      setRefining(true);
      setError(null);
      const response = await pitchPerfectService.refinePitch(
        result.introduction,
        feedback
      );
      setResult({
        ...result,
        introduction: response.refinedIntroduction,
      });
      setFeedback('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refine pitch');
    } finally {
      setRefining(false);
    }
  };

  return (
    <div className="pitch-perfect-card">
      <h2>简历优化 - 个人介绍优化器</h2>

      {/* Configuration Section */}
      <div className="pitch-config">
        <div className="config-group">
          <label htmlFor="style">风格：</label>
          <select
            id="style"
            value={style}
            onChange={(e) => setStyle(e.target.value as any)}
            disabled={loading || refining}
          >
            <option value="technical">技术型</option>
            <option value="managerial">管理型</option>
            <option value="sales">销售/市场型</option>
          </select>
        </div>

        <div className="config-group">
          <label htmlFor="duration">时长：</label>
          <select
            id="duration"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value) as any)}
            disabled={loading || refining}
          >
            <option value={30}>30 秒</option>
            <option value={60}>60 秒</option>
          </select>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading || refining}
          className="btn-primary"
        >
          {loading ? '正在生成...' : '生成优化介绍'}
        </button>
      </div>

      {/* Error Display */}
      {error && <div className="error-message">{error}</div>}

      {/* Results Section */}
      {result && (
        <div className="pitch-results">
          {/* Generated Introduction */}
          <div className="result-section">
            <h3>生成的个人介绍</h3>
            <div className="introduction-box">
              <p>{result.introduction}</p>
            </div>
          </div>

          {/* Key Highlights */}
          <div className="result-section">
            <h3>关键亮点</h3>
            <ul className="highlights-list">
              {result.highlights.map((highlight, idx) => (
                <li key={idx}>{highlight}</li>
              ))}
            </ul>
          </div>

          {/* Keyword Overlap Visualization */}
          <div className="result-section">
            <h3>关键词匹配度</h3>
            <div className="keyword-overlap">
              <div className="overlap-stat">
                <span className="stat-label">匹配分数：</span>
                <span className="stat-value">
                  {result.keywordOverlap.overlapPercentage}%
                </span>
              </div>

              <div className="overlap-details">
                <div className="matched-keywords">
                  <h4>
                    已匹配关键词 ({result.keywordOverlap.matched.length})
                  </h4>
                  <div className="keyword-tags">
                    {result.keywordOverlap.matched
                      .slice(0, 5)
                      .map((kw, idx) => (
                        <span key={idx} className="keyword-tag matched">
                          {kw}
                        </span>
                      ))}
                    {result.keywordOverlap.matched.length > 5 && (
                      <span className="keyword-tag more">
                        + 还有 {result.keywordOverlap.matched.length - 5} 个
                      </span>
                    )}
                  </div>
                </div>

                <div className="missing-keywords">
                  <h4>
                    建议增加关键词 ({result.keywordOverlap.missing.length})
                  </h4>
                  <div className="keyword-tags">
                    {result.keywordOverlap.missing
                      .slice(0, 5)
                      .map((kw, idx) => (
                        <span key={idx} className="keyword-tag missing">
                          {kw}
                        </span>
                      ))}
                    {result.keywordOverlap.missing.length > 5 && (
                      <span className="keyword-tag more">
                        + 还有 {result.keywordOverlap.missing.length - 5} 个
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Suggestions */}
          {result.suggestions.length > 0 && (
            <div className="result-section">
              <h3>改进建议</h3>
              <ul className="suggestions-list">
                {result.suggestions.map((suggestion, idx) => (
                  <li key={idx}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Refinement Section */}
          <div className="result-section refinement-section">
            <h3>Refine Your Introduction</h3>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Provide feedback for refinement (e.g., 'Make it more technical', 'Add more leadership examples')"
              disabled={refining}
              rows={3}
            />
            <button
              onClick={handleRefine}
              disabled={refining || !feedback.trim()}
              className="btn-secondary"
            >
              {refining ? 'Refining...' : 'Refine Introduction'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
