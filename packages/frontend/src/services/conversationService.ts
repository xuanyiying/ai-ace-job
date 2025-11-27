import axios from '../config/axios';

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
  messageCount: number;
  isActive: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: Record<string, unknown>[];
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface CreateConversationInput {
  title?: string;
}

export interface AddMessageInput {
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: Record<string, unknown>[];
  metadata?: Record<string, unknown>;
}

export const conversationService = {
  /**
   * Create a new conversation
   * Requirement 1: Conversation-based user interface
   */
  createConversation: async (
    input?: CreateConversationInput
  ): Promise<Conversation> => {
    const response = await axios.post('/conversations', input);
    return response.data;
  },

  /**
   * Get a specific conversation
   * Requirement 1: Conversation-based user interface
   */
  getConversation: async (conversationId: string): Promise<Conversation> => {
    const response = await axios.get(`/conversations/${conversationId}`);
    return response.data;
  },

  /**
   * List all conversations for the current user
   * Requirement 1.6: Display conversation history in sidebar
   */
  listConversations: async (): Promise<Conversation[]> => {
    const response = await axios.get('/conversations');
    return response.data;
  },

  /**
   * Update a conversation
   * Requirement 1.9: Support renaming conversations
   */
  updateConversation: async (
    conversationId: string,
    data: { title?: string; isActive?: boolean }
  ): Promise<Conversation> => {
    const response = await axios.put(`/conversations/${conversationId}`, data);
    return response.data;
  },

  /**
   * Delete a conversation
   * Requirement 1.9: Support deleting conversations
   * Property 5: Conversation deletion consistency
   */
  deleteConversation: async (conversationId: string): Promise<void> => {
    await axios.delete(`/conversations/${conversationId}`);
  },

  /**
   * Add a message to a conversation
   * Requirement 1.2: Display user messages and AI replies in conversation
   */
  addMessage: async (
    conversationId: string,
    input: AddMessageInput
  ): Promise<Message> => {
    const response = await axios.post(
      `/conversations/${conversationId}/messages`,
      input
    );
    return response.data;
  },

  /**
   * Get all messages in a conversation
   * Requirement 1.7: Load and display conversation history
   */
  getMessages: async (
    conversationId: string,
    skip?: number,
    take?: number
  ): Promise<Message[]> => {
    const params = new URLSearchParams();
    if (skip !== undefined) params.append('skip', skip.toString());
    if (take !== undefined) params.append('take', take.toString());

    const response = await axios.get(
      `/conversations/${conversationId}/messages${params.toString() ? '?' + params.toString() : ''}`
    );
    return response.data;
  },

  /**
   * Clear all messages in a conversation
   */
  clearConversation: async (conversationId: string): Promise<void> => {
    await axios.delete(`/conversations/${conversationId}/messages`);
  },
};
