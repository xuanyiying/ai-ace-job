/**
 * Resume Optimizer WebSocket Gateway
 * Handles real-time streaming of resume optimization results
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '@/user/guards/jwt-auth.guard';
import { ResumeOptimizerService } from './resume-optimizer.service';
import { StreamChunk, OptimizationOptions } from '@/types';

interface OptimizeMessage {
  content: string;
  userId: string;
  options?: OptimizationOptions;
}

/**
 * WebSocket Gateway for Resume Optimization
 * Provides real-time streaming of AI-generated resume optimizations
 */
@WebSocketGateway({
  namespace: '/resume-optimizer',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
@UseGuards(JwtAuthGuard)
export class ResumeOptimizerGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ResumeOptimizerGateway.name);
  private activeStreams = new Map<string, boolean>();

  constructor(
    private readonly resumeOptimizerService: ResumeOptimizerService
  ) {}

  /**
   * Handle client connection
   */
  handleConnection(client: Socket) {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
    this.activeStreams.delete(client.id);
  }

  /**
   * Handle resume optimization request
   * Streams AI-generated optimization results in real-time
   */
  @SubscribeMessage('optimize')
  async handleOptimize(
    @MessageBody() data: OptimizeMessage,
    @ConnectedSocket() client: Socket
  ) {
    try {
      const { content, userId, options = {} } = data;

      if (!content || !content.trim()) {
        client.emit('error', {
          type: 'error',
          message: 'Resume content is required',
          timestamp: Date.now(),
        });
        return;
      }

      if (!userId) {
        client.emit('error', {
          type: 'error',
          message: 'User ID is required',
          timestamp: Date.now(),
        });
        return;
      }

      this.logger.debug(
        `Starting resume optimization for user ${userId}, client ${client.id}`
      );

      // Mark this stream as active
      this.activeStreams.set(client.id, true);

      // Use the resume optimizer service for streaming
      const stream = this.resumeOptimizerService.optimizeResume(
        content,
        userId,
        options
      );

      for await (const chunk of stream) {
        // Check if stream was cancelled
        if (!this.activeStreams.get(client.id)) {
          this.logger.debug(`Stream cancelled for client ${client.id}`);
          break;
        }

        // Emit the chunk to the client
        client.emit(chunk.type, chunk);
      }

      // Clean up
      this.activeStreams.delete(client.id);

      this.logger.debug(
        `Resume optimization completed for user ${userId}, client ${client.id}`
      );
    } catch (error) {
      this.logger.error(
        `Resume optimization failed for client ${client.id}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );

      const errorData: StreamChunk = {
        type: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      };

      client.emit('error', errorData);
      this.activeStreams.delete(client.id);
    }
  }

  /**
   * Handle cancellation request
   * Stops the active optimization stream
   */
  @SubscribeMessage('cancel')
  handleCancel(@ConnectedSocket() client: Socket) {
    this.logger.debug(`Cancelling optimization for client ${client.id}`);

    // Mark stream as cancelled
    this.activeStreams.set(client.id, false);

    const cancelledData: StreamChunk = {
      type: 'cancelled',
      timestamp: Date.now(),
    };

    client.emit('cancelled', cancelledData);

    // Clean up after a short delay
    setTimeout(() => {
      this.activeStreams.delete(client.id);
    }, 1000);
  }
}
