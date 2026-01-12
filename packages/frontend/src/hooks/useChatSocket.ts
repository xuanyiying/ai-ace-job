/**
 * Unified Chat WebSocket Hook
 * Handles all chat communication via WebSocket
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';
import { MessageRole } from '../types';

export interface ChatMessage {
  type: 'message' | 'chunk' | 'done' | 'error' | 'typing' | 'system';
  messageId?: string;
  content?: string;
  role?: MessageRole;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface UseChatSocketOptions {
  onMessage?: (message: ChatMessage) => void;
  onChunk?: (chunk: ChatMessage) => void;
  onDone?: (message: ChatMessage) => void;
  onError?: (error: ChatMessage) => void;
  onTyping?: (typing: ChatMessage) => void;
  onSystem?: (system: ChatMessage) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export interface UseChatSocketReturn {
  isConnected: boolean;
  isStreaming: boolean;
  streamingContent: string;
  error: string | null;
  sendMessage: (
    conversationId: string,
    content: string,
    metadata?: Record<string, any>
  ) => void;
  notifyFileUploaded: (
    conversationId: string,
    resumeId: string,
    filename: string
  ) => void;
  notifyResumeParsed: (
    conversationId: string,
    resumeId: string,
    parsedContent: string
  ) => void;
  joinConversation: (conversationId: string) => void;
  cancel: () => void;
  reset: () => void;
}

export const useChatSocket = (
  options?: UseChatSocketOptions
): UseChatSocketReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const streamingContentRef = useRef('');
  const { user } = useAuthStore();

  // Initialize socket connection
  useEffect(() => {
    if (!user?.id) return;

    const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
    let serverUrl = baseUrl.replace(/\/api\/v1\/?$/, '');
    if (!serverUrl || serverUrl.startsWith('/')) {
      serverUrl = window.location.origin;
    }

    const token = localStorage.getItem('auth_token');

    socketRef.current = io(`${serverUrl}/chat`, {
      auth: { token: `Bearer ${token}` },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Connection events
    socketRef.current.on('connect', () => {
      console.log('Connected to chat server');
      setIsConnected(true);
      setError(null);
      options?.onConnected?.();
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from chat server');
      setIsConnected(false);
      options?.onDisconnected?.();
    });

    socketRef.current.on('connected', (data: ChatMessage) => {
      console.log('Chat server ready:', data.content);
    });

    // Message events
    socketRef.current.on('message', (data: ChatMessage) => {
      options?.onMessage?.(data);
    });

    socketRef.current.on('chunk', (data: ChatMessage) => {
      if (data.content) {
        streamingContentRef.current += data.content;
        setStreamingContent(streamingContentRef.current);
      }
      options?.onChunk?.(data);
    });

    socketRef.current.on('done', (data: ChatMessage) => {
      setIsStreaming(false);
      options?.onDone?.(data);
      // Note: streaming content will be cleared by the parent component
      // after it has loaded the persisted messages from the database
    });

    socketRef.current.on('error', (data: ChatMessage) => {
      setError(data.content || 'Unknown error');
      setIsStreaming(false);
      options?.onError?.(data);
    });

    socketRef.current.on('typing', (data: ChatMessage) => {
      setIsStreaming(true);
      options?.onTyping?.(data);
    });

    socketRef.current.on('system', (data: ChatMessage) => {
      options?.onSystem?.(data);
    });

    socketRef.current.on('cancelled', () => {
      setIsStreaming(false);
      streamingContentRef.current = '';
      setStreamingContent('');
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user?.id]);

  // Send message
  const sendMessage = useCallback(
    (
      conversationId: string,
      content: string,
      metadata?: Record<string, any>
    ) => {
      if (!socketRef.current?.connected) {
        setError('Not connected to chat server');
        return;
      }

      // Reset streaming state
      streamingContentRef.current = '';
      setStreamingContent('');
      setError(null);
      setIsStreaming(true);

      socketRef.current.emit('message', {
        conversationId,
        content,
        metadata,
      });
    },
    []
  );

  // Notify file uploaded
  const notifyFileUploaded = useCallback(
    (conversationId: string, resumeId: string, filename: string) => {
      if (!socketRef.current?.connected) return;

      socketRef.current.emit('file_uploaded', {
        conversationId,
        resumeId,
        filename,
      });
    },
    []
  );

  // Notify resume parsed
  const notifyResumeParsed = useCallback(
    (conversationId: string, resumeId: string, parsedContent: string) => {
      if (!socketRef.current?.connected) return;

      socketRef.current.emit('resume_parsed', {
        conversationId,
        resumeId,
        parsedContent,
      });
    },
    []
  );

  // Join conversation room
  const joinConversation = useCallback((conversationId: string) => {
    if (!socketRef.current?.connected) return;

    socketRef.current.emit('join_conversation', { conversationId });
  }, []);

  // Cancel current operation
  const cancel = useCallback(() => {
    if (!socketRef.current?.connected) return;

    socketRef.current.emit('cancel');
    setIsStreaming(false);
  }, []);

  // Reset state
  const reset = useCallback(() => {
    streamingContentRef.current = '';
    setStreamingContent('');
    setError(null);
    setIsStreaming(false);
  }, []);

  return {
    isConnected,
    isStreaming,
    streamingContent,
    error,
    sendMessage,
    notifyFileUploaded,
    notifyResumeParsed,
    joinConversation,
    cancel,
    reset,
  };
};
