import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Spin } from 'antd';
import './StreamingMarkdownBubble.css';

interface StreamingMarkdownBubbleProps {
  content: string;
  isStreaming: boolean;
}

/**
 * Component for real-time rendering of markdown content during AI streaming
 * Requirements: 2.3
 */
const StreamingMarkdownBubble: React.FC<StreamingMarkdownBubbleProps> = ({
  content,
  isStreaming,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when content changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [content]);

  return (
    <div className="streaming-markdown-bubble" ref={scrollRef}>
      <div className="markdown-content">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        {isStreaming && (
          <div className="typing-indicator">
            <Spin size="small" />
            <span className="typing-text">AI is thinking...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StreamingMarkdownBubble;
