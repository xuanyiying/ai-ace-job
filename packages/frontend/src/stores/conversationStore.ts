import { create } from 'zustand';
import { conversationService } from '../services/conversation-service';
import { Conversation, Message, MessageRole } from '../types';

interface ConversationState {
  // ... existing state fields ...
  conversations: Conversation[];
  currentConversation: Conversation | null;
  isLoadingConversations: boolean;
  conversationError: string | null;

  // Messages
  messages: Message[];
  isLoadingMessages: boolean;
  messageError: string | null;

  // Actions - Conversations
  createConversation: (title?: string) => Promise<Conversation>;
  loadConversations: () => Promise<void>;
  switchConversation: (conversationId: string) => Promise<void>;
  updateConversationTitle: (
    conversationId: string,
    title: string
  ) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  setCurrentConversation: (conversation: Conversation | null) => void;

  // Actions - Messages
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (
    conversationId: string,
    content: string,
    role?: MessageRole,
    metadata?: Record<string, unknown>
  ) => Promise<Message>;
  addMessageToState: (message: Message) => void;
  clearMessages: () => void;
}

export const useConversationStore = create<ConversationState>((set) => ({
  // Initial state
  conversations: [],
  currentConversation: null,
  isLoadingConversations: false,
  conversationError: null,
  messages: [],
  isLoadingMessages: false,
  messageError: null,

  // Conversation actions
  createConversation: async (title?: string) => {
    try {
      set({ conversationError: null });
      const conversation = await conversationService.createConversation({
        title,
      });
      set((state) => ({
        conversations: [conversation, ...state.conversations],
        currentConversation: conversation,
        messages: [],
      }));
      return conversation;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to create conversation';
      set({ conversationError: errorMessage });
      throw error;
    }
  },

  loadConversations: async () => {
    try {
      set({ isLoadingConversations: true, conversationError: null });
      const conversations = await conversationService.listConversations();
      set({ conversations, isLoadingConversations: false });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to load conversations';
      set({ conversationError: errorMessage, isLoadingConversations: false });
      throw error;
    }
  },

  switchConversation: async (conversationId: string) => {
    try {
      set({ messageError: null, isLoadingMessages: true });
      const conversation =
        await conversationService.getConversation(conversationId);
      const messages = await conversationService.getMessages(conversationId);
      set({
        currentConversation: conversation,
        messages,
        isLoadingMessages: false,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to switch conversation';
      set({ messageError: errorMessage, isLoadingMessages: false });
      throw error;
    }
  },

  updateConversationTitle: async (conversationId: string, title: string) => {
    try {
      set({ conversationError: null });
      const updated = await conversationService.updateConversation(
        conversationId,
        { title }
      );
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === conversationId ? updated : c
        ),
        currentConversation:
          state.currentConversation?.id === conversationId
            ? updated
            : state.currentConversation,
      }));
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to update conversation';
      set({ conversationError: errorMessage });
      throw error;
    }
  },

  deleteConversation: async (conversationId: string) => {
    try {
      set({ conversationError: null });
      await conversationService.deleteConversation(conversationId);
      set((state) => {
        const updatedConversations = state.conversations.filter(
          (c) => c.id !== conversationId
        );
        const isCurrentDeleted =
          state.currentConversation?.id === conversationId;
        return {
          conversations: updatedConversations,
          currentConversation: isCurrentDeleted
            ? null
            : state.currentConversation,
          messages: isCurrentDeleted ? [] : state.messages,
        };
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to delete conversation';
      set({ conversationError: errorMessage });
      throw error;
    }
  },

  setCurrentConversation: (conversation: Conversation | null) => {
    set({ currentConversation: conversation, messages: [] });
  },

  // Message actions
  loadMessages: async (conversationId: string) => {
    try {
      set({ messageError: null, isLoadingMessages: true });
      const messages = await conversationService.getMessages(conversationId);
      set({ messages, isLoadingMessages: false });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to load messages';
      set({ messageError: errorMessage, isLoadingMessages: false });
      throw error;
    }
  },

  sendMessage: async (
    conversationId: string,
    content: string,
    role: MessageRole = MessageRole.USER,
    metadata?: Record<string, unknown>
  ) => {
    try {
      set({ messageError: null });
      const message = await conversationService.addMessage(conversationId, {
        role,
        content,
        metadata,
      });
      set((state) => ({
        messages: [...state.messages, message],
        currentConversation: state.currentConversation
          ? {
              ...state.currentConversation,
              messageCount: state.currentConversation.messageCount + 1,
              lastMessageAt: new Date().toISOString(),
            }
          : null,
      }));
      return message;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to send message';
      set({ messageError: errorMessage });
      throw error;
    }
  },

  addMessageToState: (message: Message) => {
    set((state) => ({
      messages: [...state.messages, message],
    }));
  },

  clearMessages: () => {
    set({ messages: [] });
  },
}));
