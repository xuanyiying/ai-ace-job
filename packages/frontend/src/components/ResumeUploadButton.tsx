import React, { useRef } from 'react';
import { Button, message } from 'antd';
import { CloudUploadOutlined } from '@ant-design/icons';
import './ResumeUploadButton.css';

interface ResumeUploadButtonProps {
  onFileSelect: (file: File) => void;
  className?: string;
  disabled?: boolean;
  children?: React.ReactNode;
}

/**
 * 简历上传按钮组件
 * 仅负责触发文件选择，上传逻辑由父组件处理
 */
const ResumeUploadButton: React.FC<ResumeUploadButtonProps> = ({
  onFileSelect,
  className,
  disabled,
  children,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理文件选择
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    const isPDF = file.type === 'application/pdf';
    const isDoc =
      file.type === 'application/msword' ||
      file.type ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    if (!isPDF && !isDoc) {
      message.error('只能上传 PDF 或 Word 文档！');
      return;
    }

    // 验证文件大小
    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error('文件大小不能超过 10MB！');
      return;
    }

    onFileSelect(file);

    // 重置 input，允许再次选择同一个文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 触发文件选择
  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
      <Button
        type="text"
        icon={!children && <CloudUploadOutlined />}
        onClick={triggerFileSelect}
        className={className}
        disabled={disabled}
        style={{ border: 'none', boxShadow: 'none' }}
      >
        {children}
      </Button>
    </>
  );
};

export default ResumeUploadButton;
