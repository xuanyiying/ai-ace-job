import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Sanitizer } from '../common/utils/sanitizer';

export interface CreateConversationInput {
  title?: string;
}

export interface UpdateConversationInput {
  title?: string;
  isActive?: boolean;
}

export interface AddMessageInput {
  role: string;
  content: string;
  attachments?: any[];
  metadata?: Record<string, any>;
}

@Injectable()
export class ConversationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new conversation session
   * Requirement 1: Conversation-based user interface
   */
  async createConversation(
    userId: string,
    input?: CreateConversationInput
  ): Promise<any> {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    const title = input?.title
      ? Sanitizer.sanitizeString(input.title)
      : `Conversation ${new Date().toLocaleDateString()}`;

    return this.prisma.conversation.create({
      data: {
        userId,
        title,
        isActive: true,
        messageCount: 0,
      },
    });
  }

  /**
   * Get a specific conversation by ID
   * Requirement 1: Conversation-based user interface
   */
  async getConversation(conversationId: string): Promise<any> {
    if (!conversationId) {
      throw new BadRequestException('Conversation ID is required');
    }

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  /**
   * List all conversations for a user
   * Requirement 1.6: Display conversation history in sidebar
   */
  async listConversations(userId: string): Promise<any[]> {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    return this.prisma.conversation.findMany({
      where: {
        userId,
        isActive: true,
      },
      orderBy: {
        lastMessageAt: 'desc',
      },
    });
  }

  /**
   * Update a conversation
   * Requirement 1.9: Support renaming and deleting conversations
   */
  async updateConversation(
    conversationId: string,
    input: UpdateConversationInput
  ): Promise<any> {
    if (!conversationId) {
      throw new BadRequestException('Conversation ID is required');
    }

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const updateData: any = {};

    if (input.title !== undefined) {
      updateData.title = Sanitizer.sanitizeString(input.title);
    }

    if (input.isActive !== undefined) {
      updateData.isActive = input.isActive;
    }

    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: updateData,
    });
  }

  /**
   * Delete a conversation (soft delete by marking as inactive)
   * Requirement 1.9: Support deleting conversations
   * Property 5: Conversation deletion consistency
   */
  async deleteConversation(conversationId: string): Promise<void> {
    if (!conversationId) {
      throw new BadRequestException('Conversation ID is required');
    }

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Soft delete by marking as inactive
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { isActive: false },
    });
  }

  /**
   * Add a message to a conversation
   * Requirement 1.2: Display user messages and AI replies in conversation
   */
  async addMessage(
    conversationId: string,
    userId: string,
    input: AddMessageInput
  ): Promise<any> {
    if (!conversationId) {
      throw new BadRequestException('Conversation ID is required');
    }

    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    if (!input.content || input.content.trim().length === 0) {
      throw new BadRequestException('Message content is required');
    }

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Sanitize message content
    const sanitizedContent = Sanitizer.sanitizeString(input.content);

    // Create message and update conversation
    const messageData: any = {
      conversationId,
      userId,
      role: input.role,
      content: sanitizedContent,
    };

    if (input.attachments) {
      messageData.attachments = input.attachments;
    }

    if (input.metadata) {
      messageData.metadata = input.metadata;
    }

    const message = await this.prisma.message.create({
      data: messageData,
    });

    // Update conversation metadata
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        messageCount: {
          increment: 1,
        },
        lastMessageAt: new Date(),
      },
    });

    return message;
  }

  /**
   * Get all messages for a conversation
   * Requirement 1.7: Load and display conversation history
   */
  async getMessages(conversationId: string): Promise<any[]> {
    if (!conversationId) {
      throw new BadRequestException('Conversation ID is required');
    }

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  /**
   * Get messages for a conversation with pagination
   */
  async getMessagesPaginated(
    conversationId: string,
    skip: number = 0,
    take: number = 50
  ): Promise<unknown[]> {
    if (!conversationId) {
      throw new BadRequestException('Conversation ID is required');
    }

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: {
        createdAt: 'asc',
      },
      skip,
      take,
    });
  }

  /**
   * Delete all messages in a conversation
   */
  async clearConversation(conversationId: string): Promise<void> {
    if (!conversationId) {
      throw new BadRequestException('Conversation ID is required');
    }

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    await this.prisma.message.deleteMany({
      where: { conversationId },
    });

    // Reset message count
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        messageCount: 0,
        lastMessageAt: null,
      },
    });
  }
}
