import React, { useMemo } from 'react';
import { Button, Upload, Empty, Tag, Popconfirm, Typography } from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { Resume, ParseStatus } from '../../types';

const { Text } = Typography;

interface ResumeSidebarProps {
  resumes: Resume[];
  currentResume: Resume | null;
  onSelect: (resume: Resume) => void;
  onUpload: (file: File) => void;
  onDelete: (resumeId: string) => void;
  uploading: boolean;
}

export const ResumeSidebar: React.FC<ResumeSidebarProps> = ({
  resumes,
  currentResume,
  onSelect,
  onUpload,
  onDelete,
  uploading,
}) => {
  const { t } = useTranslation();

  // Simple sort by date descending
  const sortedResumes = useMemo(() => {
    return [...(resumes || [])].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [resumes]);

  const getStatusTag = (status: ParseStatus) => {
    switch (status) {
      case ParseStatus.COMPLETED:
        return (
          <Tag color="success" className="mr-0 !text-xs !px-1.5 !leading-5 border-none bg-green-500/10 text-green-600">
            {t('resume.status_completed', '已解析')}
          </Tag>
        );
      case ParseStatus.PROCESSING:
        return (
          <Tag color="processing" className="mr-0 !text-xs !px-1.5 !leading-5 border-none">
            {t('resume.status_processing', '解析中')}
          </Tag>
        );
      case ParseStatus.FAILED:
        return <Tag color="error" className="mr-0 !text-xs !px-1.5 !leading-5 border-none">{t('resume.status_failed', '失败')}</Tag>;
      default:
        return (
          <Tag color="default" className="mr-0 !text-xs !px-1.5 !leading-5 border-none">{t('resume.status_pending', '待处理')}</Tag>
        );
    }
  };

  return (
    <aside className="resume-sidebar h-full flex flex-col">
      <div className="resume-list-card flex-1 flex flex-col min-h-0 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-0 rounded-2xl overflow-hidden shadow-lg">
        {/* Header Section - Simplified */}
        <div className="p-4 border-none flex justify-end">
          <Upload
            beforeUpload={(file) => {
              onUpload(file);
              return false;
            }}
            showUploadList={false}
            accept=".pdf,.doc,.docx"
          >
            <Button
              type="primary"
              shape="round"
              icon={<PlusOutlined />}
              loading={uploading}
              className="shadow-md shadow-primary/20"
            >
              {t('resume.upload', '上传简历')}
            </Button>
          </Upload>
        </div>

        {/* List Section */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-4 space-y-2">
          {!sortedResumes || sortedResumes.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center opacity-50">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={t('resume.no_resumes', '暂无简历')}
              />
            </div>
          ) : (
            sortedResumes.map((item: Resume) => (
              <div
                key={item.id}
                className={`
                  group relative flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all duration-200
                  ${item.id === currentResume?.id 
                    ? 'bg-white dark:bg-white/10 shadow-sm ring-1 ring-black/5 dark:ring-white/10' 
                    : 'hover:bg-white/60 dark:hover:bg-white/5'
                  }
                `}
                onClick={() => onSelect(item)}
              >
                {/* Active Indicator Bar */}
                {item.id === currentResume?.id && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
                )}

                {/* Content */}
                <div className="flex-1 min-w-0 flex flex-col gap-1.5 pl-2">
                  <div className="flex justify-between items-start">
                    <Text 
                      className={`
                        block truncate text-sm font-medium leading-tight
                        ${item.id === currentResume?.id ? 'text-primary' : 'text-gray-700 dark:text-gray-200'}
                      `}
                      ellipsis={{ tooltip: true }}
                    >
                      {item.title || item.originalFilename}
                    </Text>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="flex items-center gap-2">
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    </span>
                    {getStatusTag(item.parseStatus)}
                  </div>
                </div>

                {/* Delete Action - Flex Item */}
                <div 
                  className="flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Popconfirm
                    title={t('resume.delete_confirm_title', '确认删除')}
                    description={t('resume.delete_confirm_content', '确定要删除这份简历吗？')}
                    onConfirm={() => onDelete(item.id)}
                    okText={t('common.yes', '是')}
                    cancelText={t('common.no', '否')}
                    placement="left"
                  >
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      size="small"
                      className="!flex !items-center !justify-center w-8 h-8 rounded-lg hover:!bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                    />
                  </Popconfirm>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
};
