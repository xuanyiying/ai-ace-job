/**
 * Chat Module
 * Provides unified WebSocket chat functionality
 */

import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ChatGateway } from './chat.gateway';
import { ChatIntentService } from './chat-intent.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { AIProvidersModule } from '@/ai-providers/ai-providers.module';
import { ResumeModule } from '@/resume/resume.module';

@Module({
  imports: [
    PrismaModule,
    AIProvidersModule,
    forwardRef(() => ResumeModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'your-secret-key',
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '7d',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [ChatGateway, ChatIntentService],
  exports: [ChatGateway, ChatIntentService],
})
export class ChatModule {}
