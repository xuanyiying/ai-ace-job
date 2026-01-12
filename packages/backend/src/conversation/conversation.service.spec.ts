import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ConversationService', () => {
  let service: ConversationService;
  let prismaService: PrismaService;

  const mockConversation = {
    id: 'conv-1',
    userId: 'user-1',
    title: 'Test Conversation',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastMessageAt: null,
    messageCount: 0,
  };

  const mockMessage = {
    id: 'msg-1',
    conversationId: 'conv-1',
    userId: 'user-1',
    role: 'USER' as any,
    content: 'Hello, AI!',
    attachments: null,
    metadata: null,
    createdAt: new Date(),
    timestamp: expect.any(Number),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationService,
        {
          provide: PrismaService,
          useValue: {
            conversation: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            message: {
              create: jest.fn(),
              findMany: jest.fn(),
              deleteMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ConversationService>(ConversationService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('createConversation', () => {
    it('should create a new conversation with default title', async () => {
      jest
        .spyOn(prismaService.conversation, 'create')
        .mockResolvedValue(mockConversation as any);

      const result = await service.createConversation('user-1');

      expect(prismaService.conversation.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          title: expect.any(String),
          messageCount: 0,
        },
      });
      expect(result).toEqual(mockConversation);
    });

    it('should create a new conversation with custom title', async () => {
      jest
        .spyOn(prismaService.conversation, 'create')
        .mockResolvedValue(mockConversation as any);

      const result = await service.createConversation('user-1', {
        title: 'Custom Title',
      });

      expect(prismaService.conversation.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          title: 'Custom Title',
          messageCount: 0,
        },
      });
      expect(result).toEqual(mockConversation);
    });

    it('should throw BadRequestException if userId is missing', async () => {
      await expect(service.createConversation('')).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('getConversation', () => {
    it('should return a conversation by ID', async () => {
      jest
        .spyOn(prismaService.conversation, 'findUnique')
        .mockResolvedValue(mockConversation as any);

      const result = await service.getConversation('conv-1');

      expect(prismaService.conversation.findUnique).toHaveBeenCalledWith({
        where: { id: 'conv-1' },
      });
      expect(result).toEqual(mockConversation);
    });

    it('should throw NotFoundException if conversation does not exist', async () => {
      jest
        .spyOn(prismaService.conversation, 'findUnique')
        .mockResolvedValue(null);

      await expect(service.getConversation('conv-1')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw BadRequestException if conversationId is missing', async () => {
      await expect(service.getConversation('')).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('listConversations', () => {
    it('should return all conversations for a user', async () => {
      const conversations = [mockConversation];
      jest
        .spyOn(prismaService.conversation, 'findMany')
        .mockResolvedValue(conversations as any);

      const result = await service.listConversations('user-1');

      expect(prismaService.conversation.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
        },
        orderBy: {
          lastMessageAt: 'desc',
        },
      });
      expect(result).toEqual(conversations);
    });

    it('should throw BadRequestException if userId is missing', async () => {
      await expect(service.listConversations('')).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('updateConversation', () => {
    it('should update conversation title', async () => {
      const updatedConversation = {
        ...mockConversation,
        title: 'Updated Title',
      };
      jest
        .spyOn(prismaService.conversation, 'findUnique')
        .mockResolvedValue(mockConversation as any);
      jest
        .spyOn(prismaService.conversation, 'update')
        .mockResolvedValue(updatedConversation as any);

      const result = await service.updateConversation('conv-1', {
        title: 'Updated Title',
      });

      expect(prismaService.conversation.update).toHaveBeenCalledWith({
        where: { id: 'conv-1' },
        data: { title: 'Updated Title' },
      });
      expect(result).toEqual(updatedConversation);
    });

    it('should throw NotFoundException if conversation does not exist', async () => {
      jest
        .spyOn(prismaService.conversation, 'findUnique')
        .mockResolvedValue(null);

      await expect(
        service.updateConversation('conv-1', { title: 'New Title' })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteConversation', () => {
    it('should hard delete a conversation', async () => {
      jest
        .spyOn(prismaService.conversation, 'findUnique')
        .mockResolvedValue(mockConversation as any);
      jest
        .spyOn(prismaService.conversation, 'delete')
        .mockResolvedValue(mockConversation as any);

      await service.deleteConversation('conv-1');

      expect(prismaService.conversation.delete).toHaveBeenCalledWith({
        where: { id: 'conv-1' },
      });
    });

    it('should throw NotFoundException if conversation does not exist', async () => {
      jest
        .spyOn(prismaService.conversation, 'findUnique')
        .mockResolvedValue(null);

      await expect(service.deleteConversation('conv-1')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw BadRequestException if conversationId is missing', async () => {
      await expect(service.deleteConversation('')).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('addMessage', () => {
    it('should add a message to a conversation', async () => {
      jest
        .spyOn(prismaService.conversation, 'findUnique')
        .mockResolvedValue(mockConversation as any);
      jest
        .spyOn(prismaService.message, 'create')
        .mockResolvedValue(mockMessage);
      jest.spyOn(prismaService.conversation, 'update').mockResolvedValue({
        ...mockConversation,
        messageCount: 1,
        lastMessageAt: new Date(),
      } as any);

      const result = await service.addMessage('conv-1', 'user-1', {
        role: 'USER',
        content: 'Hello, AI!',
      });

      expect(prismaService.message.create).toHaveBeenCalledWith({
        data: {
          conversationId: 'conv-1',
          userId: 'user-1',
          role: 'USER',
          content: 'Hello, AI!',
        },
      });
      expect(result).toEqual(mockMessage);
    });

    it('should throw BadRequestException if content is empty', async () => {
      jest
        .spyOn(prismaService.conversation, 'findUnique')
        .mockResolvedValue(mockConversation as any);

      await expect(
        service.addMessage('conv-1', 'user-1', {
          role: 'USER',
          content: '   ',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if conversation does not exist', async () => {
      jest
        .spyOn(prismaService.conversation, 'findUnique')
        .mockResolvedValue(null);

      await expect(
        service.addMessage('conv-1', 'user-1', {
          role: 'USER',
          content: 'Hello',
        })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMessages', () => {
    it('should return all messages for a conversation', async () => {
      const messages = [mockMessage];
      jest
        .spyOn(prismaService.conversation, 'findUnique')
        .mockResolvedValue(mockConversation as any);
      jest.spyOn(prismaService.message, 'findMany').mockResolvedValue(messages);

      const result = await service.getMessages('conv-1');

      expect(prismaService.message.findMany).toHaveBeenCalledWith({
        where: { conversationId: 'conv-1' },
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toEqual(messages);
    });

    it('should throw NotFoundException if conversation does not exist', async () => {
      jest
        .spyOn(prismaService.conversation, 'findUnique')
        .mockResolvedValue(null);

      await expect(service.getMessages('conv-1')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('getMessagesPaginated', () => {
    it('should return paginated messages', async () => {
      const messages = [mockMessage];
      jest
        .spyOn(prismaService.conversation, 'findUnique')
        .mockResolvedValue(mockConversation as any);
      jest.spyOn(prismaService.message, 'findMany').mockResolvedValue(messages);

      const result = await service.getMessagesPaginated('conv-1', 0, 50);

      expect(prismaService.message.findMany).toHaveBeenCalledWith({
        where: { conversationId: 'conv-1' },
        orderBy: { createdAt: 'asc' },
        skip: 0,
        take: 50,
      });
      expect(result).toEqual(messages);
    });
  });

  describe('clearConversation', () => {
    it('should delete all messages and reset conversation', async () => {
      jest
        .spyOn(prismaService.conversation, 'findUnique')
        .mockResolvedValue(mockConversation as any);
      jest
        .spyOn(prismaService.message, 'deleteMany')
        .mockResolvedValue({ count: 5 });
      jest.spyOn(prismaService.conversation, 'update').mockResolvedValue({
        ...mockConversation,
        messageCount: 0,
        lastMessageAt: null,
      } as any);

      await service.clearConversation('conv-1');

      expect(prismaService.message.deleteMany).toHaveBeenCalledWith({
        where: { conversationId: 'conv-1' },
      });
      expect(prismaService.conversation.update).toHaveBeenCalledWith({
        where: { id: 'conv-1' },
        data: {
          messageCount: 0,
          lastMessageAt: null,
        },
      });
    });
  });
});
