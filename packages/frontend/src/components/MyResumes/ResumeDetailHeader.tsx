import React from 'react';
import { Button, Tag, Space, Tooltip } from 'antd';
import {
  EyeOutlined,
  HistoryOutlined,
  RocketOutlined,
  ThunderboltOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { Resume, ParseStatus } from '../../types';

export type ResumeViewMode = 'detail' | 'preview' | 'history' | 'analysis' | 'optimization';

interface ResumeDetailHeaderProps {
  resume: Resume;
  activeView: ResumeViewMode;
  onViewChange: (view: ResumeViewMode) => void;
  onSetPrimary: () => void;
}

export const ResumeDetailHeader: React.FC<ResumeDetailHeaderProps> = ({
  resume,
  activeView,
  onViewChange,
  onSetPrimary,
}) => {
  const { t } = useTranslation();

  const getButtonClass = (view: ResumeViewMode) => {
    const isActive = activeView === view;
    const baseClass = "transition-all duration-300 flex items-center justify-center w-10 h-10 !p-0";
    if (isActive) {
      return `${baseClass} bg-primary text-white border-primary shadow-lg shadow-primary/30 hover:!bg-primary hover:!text-white hover:scale-105`;
    }
    return `${baseClass} glass-button hover:bg-white/5 hover:text-primary hover:border-primary/50`;
  };

  const getTooltipProps = (title: string) => ({
    title,
    mouseEnterDelay: 0.3,
    mouseLeaveDelay: 0.5,
    overlayInnerStyle: { 
      backgroundColor: 'rgba(0, 0, 0, 0.75)', 
      backdropFilter: 'blur(4px)',
      borderRadius: '8px',
      padding: '6px 12px'
    }
  });

  return (
    <div className="resume-detail-header mb-6">
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-bold m-0 break-words line-clamp-2">
              {resume.title || resume.originalFilename}
            </h2>
            <Tag className="glass-tag text-secondary">v{resume.version}</Tag>
          </div>
          <Space className="text-secondary">
            <HistoryOutlined />
            <span>上次更新: {new Date(resume.createdAt).toLocaleString()}</span>
          </Space>
        </div>
        <Space size="middle" wrap>
          {resume.parseStatus === ParseStatus.COMPLETED && (
            <Tooltip {...getTooltipProps('简历详情')}>
               <Button
                  icon={<FileTextOutlined />}
                  onClick={() => onViewChange('detail')}
                  className={getButtonClass('detail')}
                  shape="circle"
                />
            </Tooltip>
          )}

          <Tooltip {...getTooltipProps('预览原文')}>
            <Button
              icon={<EyeOutlined />}
              onClick={() => onViewChange('preview')}
              className={getButtonClass('preview')}
              shape="circle"
            />
          </Tooltip>

          <Tooltip {...getTooltipProps(t('resume.optimization_history', '优化历史'))}>
            <Button
              icon={<HistoryOutlined />}
              onClick={() => onViewChange('history')}
              className={getButtonClass('history')}
              shape="circle"
            />
          </Tooltip>

          {resume.parseStatus === ParseStatus.COMPLETED && (
            <>
              <Tooltip {...getTooltipProps('深度诊断')}>
                <Button
                  icon={<ThunderboltOutlined />}
                  onClick={() => onViewChange('analysis')}
                  className={activeView === 'analysis' 
                    ? "!bg-purple-600 !text-white !border-purple-600 shadow-lg shadow-purple-500/30 hover:!bg-purple-600 hover:!text-white hover:scale-105 transition-all duration-300 flex items-center justify-center w-10 h-10 !p-0"
                    : "glass-button !border-purple-500/30 !text-purple-600 hover:!text-purple-700 hover:bg-purple-500/10 transition-all duration-300 flex items-center justify-center w-10 h-10 !p-0"}
                  shape="circle"
                />
              </Tooltip>
              
              <Tooltip {...getTooltipProps(t('resume.optimize', '优化简历'))}>
                <Button
                  icon={<RocketOutlined />}
                  onClick={() => onViewChange('optimization')}
                  className={activeView === 'optimization'
                    ? "bg-gradient-to-r from-primary to-blue-600 !text-white border-none shadow-lg shadow-primary/20 hover:scale-105 transition-all duration-300 flex items-center justify-center w-10 h-10 !p-0"
                    : "bg-gradient-to-r from-primary/80 to-blue-600/80 !text-white/90 border-none hover:from-primary hover:to-blue-600 hover:!text-white hover:scale-105 transition-all duration-300 flex items-center justify-center w-10 h-10 !p-0"}
                  shape="circle"
                />
              </Tooltip>
            </>
          )}
          
          {!resume.isPrimary && (
            <Tooltip {...getTooltipProps(t('resume.set_as_active', '设为当前活跃'))}>
              <Button
                onClick={onSetPrimary}
                className="glass-button hover:bg-primary/10 hover:!text-primary hover:!border-primary/50"
              >
                {t('resume.set_as_active', '设为当前活跃')}
              </Button>
            </Tooltip>
          )}
        </Space>
      </div>
    </div>
  );
};
