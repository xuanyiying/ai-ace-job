import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';

@Controller('api/v1/conversations')
@UseGuards(JwtAuthGuard)
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  /**
   * Create a new conversation
   * POST /api/v1/conversations
   */
  @Post()
  async createConversation(
    @Request() req: any,
    @Body() body?: { title?: string }
  ) {
    return this.conversationService.createConversation(req.user.id, body);
  }

  /**
   * Get all conversations for the current user
   * GET /api/v1/conversations
   */
  @Get()
  async listConversations(@Request() req: any) {
    return this.conversationService.listConversations(req.user.id);
  }

  /**
   * Get a specific conversation
   * GET /api/v1/conversations/:id
   */
  @Get(':id')
  async getConversation(@Param('id') conversationId: string) {
    return this.conversationService.getConversation(conversationId);
  }

  /**
   * Update a conversation
   * PUT /api/v1/conversations/:id
   */
  @Put(':id')
  async updateConversation(
    @Param('id') conversationId: string,
    @Body() body: { title?: string; isActive?: boolean }
  ) {
    return this.conversationService.updateConversation(conversationId, body);
  }

  /**
   * Delete a conversation
   * DELETE /api/v1/conversations/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteConversation(@Param('id') conversationId: string) {
    await this.conversationService.deleteConversation(conversationId);
  }

  /**
   * Add a message to a conversation
   * POST /api/v1/conversations/:id/messages
   */
  @Post(':id/messages')
  async addMessage(
    @Param('id') conversationId: string,
    @Request() req: any,
    @Body()
    body: {
      role: string;
      content: string;
      attachments?: any[];
      metadata?: Record<string, unknown>;
    }
  ) {
    return this.conversationService.addMessage(conversationId, req.user.id, {
      role: body.role,
      content: body.content,
      attachments: body.attachments,
      metadata: body.metadata,
    });
  }

  /**
   * Get all messages in a conversation
   * GET /api/v1/conversations/:id/messages
   */
  @Get(':id/messages')
  async getMessages(
    @Param('id') conversationId: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string
  ) {
    const skipNum = skip ? parseInt(skip, 10) : 0;
    const takeNum = take ? parseInt(take, 10) : 50;

    return this.conversationService.getMessagesPaginated(
      conversationId,
      skipNum,
      takeNum
    );
  }

  /**
   * Clear all messages in a conversation
   * DELETE /api/v1/conversations/:id/messages
   */
  @Delete(':id/messages')
  @HttpCode(HttpStatus.NO_CONTENT)
  async clearConversation(@Param('id') conversationId: string) {
    await this.conversationService.clearConversation(conversationId);
  }
}
