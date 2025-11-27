import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useConversationStore } from './conversationStore';

describe('useConversationStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const store = useConversationStore.getState();
    store.clearMessages();
    store.setCurrentConversation(null);
  });
  describe('setCurrentConversation', () => {
    it('should set the current conversation', () => {
      const { result } = renderHook(() => useConversationStore());

      const mockConversation = {
        id: 'conv-1',
        userId: 'user-1',
        title: 'Test Conversation',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        messageCount: 0,
        isActive: true,
      };

      act(() => {
        result.current.setCurrentConversation(mockConversation);
      });

      expect(result.current.currentConversation).toEqual(mockConversation);
      expect(result.current.messages).toEqual([]);
    });

    it('should clear current conversation when set to null', () => {
      const { result } = renderHook(() => useConversationStore());

      const mockConversation = {
        id: 'conv-1',
        userId: 'user-1',
        title: 'Test Conversation',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        messageCount: 0,
        isActive: true,
      };

      act(() => {
        result.current.setCurrentConversation(mockConversation);
      });

      expect(result.current.currentConversation).toEqual(mockConversation);

      act(() => {
        result.current.setCurrentConversation(null);
      });

      expect(result.current.currentConversation).toBeNull();
    });
  });

  describe('addMessageToState', () => {
    it('should add a message to the messages array', () => {
      const { result } = renderHook(() => useConversationStore());

      const mockMessage = {
        id: 'msg-1',
        conversationId: 'conv-1',
        userId: 'user-1',
        role: 'user' as const,
        content: 'Hello',
        createdAt: '2024-01-01T00:00:00Z',
      };

      act(() => {
        result.current.addMessageToState(mockMessage);
      });

      expect(result.current.messages).toContain(mockMessage);
      expect(result.current.messages.length).toBe(1);
    });

    it('should add multiple messages in order', () => {
      const { result } = renderHook(() => useConversationStore());

      const msg1 = {
        id: 'msg-1',
        conversationId: 'conv-1',
        userId: 'user-1',
        role: 'user' as const,
        content: 'Hello',
        createdAt: '2024-01-01T00:00:00Z',
      };

      const msg2 = {
        id: 'msg-2',
        conversationId: 'conv-1',
        userId: 'user-1',
        role: 'assistant' as const,
        content: 'Hi there!',
        createdAt: '2024-01-01T00:01:00Z',
      };

      act(() => {
        result.current.addMessageToState(msg1);
        result.current.addMessageToState(msg2);
      });

      expect(result.current.messages.length).toBe(2);
      expect(result.current.messages[0]).toEqual(msg1);
      expect(result.current.messages[1]).toEqual(msg2);
    });
  });

  describe('clearMessages', () => {
    it('should clear all messages', () => {
      const { result } = renderHook(() => useConversationStore());

      const mockMessage = {
        id: 'msg-1',
        conversationId: 'conv-1',
        userId: 'user-1',
        role: 'user' as const,
        content: 'Hello',
        createdAt: '2024-01-01T00:00:00Z',
      };

      act(() => {
        result.current.addMessageToState(mockMessage);
      });

      expect(result.current.messages.length).toBe(1);

      act(() => {
        result.current.clearMessages();
      });

      expect(result.current.messages).toEqual([]);
    });
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useConversationStore());

      expect(result.current.conversations).toEqual([]);
      expect(result.current.currentConversation).toBeNull();
      expect(result.current.isLoadingConversations).toBe(false);
      expect(result.current.conversationError).toBeNull();
      expect(result.current.messages).toEqual([]);
      expect(result.current.isLoadingMessages).toBe(false);
      expect(result.current.messageError).toBeNull();
    });
  });
});
