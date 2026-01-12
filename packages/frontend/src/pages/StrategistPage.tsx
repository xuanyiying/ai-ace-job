import React, { useState } from 'react';
import { StrategistCard } from '../components/StrategistCard';
import { ParsedResumeData } from '../types';
import { Typography, Space, Input, Button, Card } from 'antd';
import { RocketOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import './agents.css';

const { Title, Text } = Typography;
const { TextArea } = Input;

export const StrategistPage: React.FC = () => {
  const [resumeData, setResumeData] = useState<ParsedResumeData | null>(null);
  const [resumeJson, setResumeJson] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [showForm, setShowForm] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (resumeData && jobDescription.trim()) {
      setShowForm(false);
    }
  };

  const handleJsonChange = (value: string) => {
    setResumeJson(value);
    try {
      const parsed = JSON.parse(value);
      setResumeData(parsed);
    } catch {
      setResumeData(null);
    }
  };

  return (
    <div className="min-h-full p-6 md:p-10 animate-fade-in relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary-500/10 border border-primary-500/20 mb-4 animate-bounce-slow">
            <RocketOutlined className="text-3xl text-primary-400" />
          </div>
          <Title
            level={1}
            className="!text-white !font-bold tracking-tight !mb-2 mt-2"
          >
            面试预测
          </Title>
          <Text className="!text-gray-400 text-lg block">
            基于您的背景和目标职位，智能预测面试问题并提供对策
          </Text>
        </div>

        {showForm ? (
          <div className="glass-card p-8 md:p-10 border border-white/10 max-w-3xl mx-auto">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-3">
                <label className="text-gray-300 font-medium text-base ml-1">
                  简历数据
                </label>
                <TextArea
                  value={resumeJson}
                  onChange={(e) => handleJsonChange(e.target.value)}
                  placeholder="请粘贴解析后的简历数据..."
                  autoSize={{ minRows: 6, maxRows: 12 }}
                  className="!bg-white/5 !border-white/10 !text-white placeholder:!text-gray-600 !rounded-xl transition-all"
                />
                {!resumeData && resumeJson && (
                  <Text type="danger" className="text-xs ml-1">
                    无效的 JSON 格式
                  </Text>
                )}
              </div>

              <div className="space-y-3">
                <label className="text-gray-300 font-medium text-base ml-1">
                  职位描述 (JD)
                </label>
                <TextArea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="请粘贴您要申请的职位描述..."
                  autoSize={{ minRows: 4, maxRows: 8 }}
                  className="!bg-white/5 !border-white/10 !text-white placeholder:!text-gray-600 !rounded-xl transition-all"
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={!resumeData || !jobDescription.trim()}
                  className="gradient-button w-full h-12 text-lg font-bold shadow-xl hover:shadow-primary-500/30 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.01] transition-all"
                >
                  生成面试策略方案
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            <Card className="!bg-transparent !border-none">
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 text-primary-400 hover:text-primary-300 transition-colors mb-6 font-medium"
              >
                <ArrowLeftOutlined /> 返回重新输入
              </button>

              {resumeData && jobDescription && (
                <div className="glass-card overflow-hidden border border-white/10">
                  <StrategistCard
                    resumeData={resumeData}
                    jobDescription={jobDescription}
                  />
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default StrategistPage;
