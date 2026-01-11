import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';

interface StreamChunk {
  type: 'chunk' | 'done' | 'error' | 'cancelled';
  content?: string;
  timestamp?: number;
  complete?: boolean;
  message?: string;
}

interface UseStreamingOptimizationReturn {
  content: string;
  isStreaming: boolean;
  error: string | null;
  optimize: (resumeContent: string, language?: string) => void;
  cancel: () => void;
  reset: () => void;
}

/**
 * Hook for managing resume optimization streaming via WebSocket
 * Requirements: 2.2, 2.3
 */
interface UseStreamingOptimizationOptions {
  onDone?: (content: string) => void;
  onError?: (error: string) => void;
}

export const useStreamingOptimization = (
  options?: UseStreamingOptimizationOptions
): UseStreamingOptimizationReturn => {
  const [content, setContent] = useState<string>('');
  const contentRef = useRef<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const { user } = useAuthStore();

  const cleanup = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const optimize = useCallback(
    (resumeContent: string, language: string = 'zh-CN') => {
      if (!user?.id) {
        setError('User not authenticated');
        return;
      }

      // Reset state
      setContent('');
      contentRef.current = '';
      setError(null);
      setIsStreaming(true);

      // Initialize socket if not already done
      if (!socketRef.current) {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
        // Remove /api/v1 from baseUrl if it exists to get the server root
        const serverUrl = baseUrl.replace(/\/api\/v1\/?$/, '');

        const token = localStorage.getItem('auth_token');

        socketRef.current = io(`${serverUrl}/resume-optimizer`, {
          auth: {
            token: `Bearer ${token}`,
          },
          transports: ['websocket'],
        });

        socketRef.current.on('connect', () => {
          console.log('Connected to resume-optimizer gateway');
          // Send optimization request after connection
          socketRef.current?.emit('optimize', {
            content: resumeContent,
            userId: user.id,
            language,
          });
        });

        socketRef.current.on('chunk', (data: StreamChunk) => {
          if (data.content) {
            contentRef.current += data.content;
            setContent(contentRef.current);
          }
        });

        socketRef.current.on('done', () => {
          setIsStreaming(false);
          if (options?.onDone) {
            options.onDone(contentRef.current);
          }
        });

        socketRef.current.on('error', (data: StreamChunk) => {
          const errMsg =
            data.message || 'An error occurred during optimization';
          setError(errMsg);
          setIsStreaming(false);
          if (options?.onError) {
            options.onError(errMsg);
          }
        });

        socketRef.current.on('cancelled', () => {
          setIsStreaming(false);
        });

        socketRef.current.on('disconnect', () => {
          console.log('Disconnected from resume-optimizer gateway');
          setIsStreaming(false);
        });
      } else if (socketRef.current.connected) {
        // If already connected, just emit the event
        socketRef.current.emit('optimize', {
          content: resumeContent,
          userId: user.id,
          language,
        });
      } else {
        // If socket exists but disconnected, reconnect
        socketRef.current.connect();
      }
    },
    [user?.id]
  );

  const cancel = useCallback(() => {
    if (socketRef.current && isStreaming) {
      socketRef.current.emit('cancel');
    }
  }, [isStreaming]);

  const reset = useCallback(() => {
    setContent('');
    setError(null);
    setIsStreaming(false);
  }, []);

  return {
    content,
    isStreaming,
    error,
    optimize,
    cancel,
    reset,
  };
};
