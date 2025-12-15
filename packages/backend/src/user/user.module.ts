import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserNotificationsController } from './user-notifications.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { GithubStrategy } from './strategies/github.strategy';
import { PrismaModule } from '@/prisma/prisma.module';
import { EmailModule } from '@/email/email.module';
import { InvitationModule } from '@/invitation/invitation.module';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    EmailModule,
    InvitationModule,
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
  controllers: [UserController, UserNotificationsController],
  providers: [UserService, JwtStrategy, GoogleStrategy, GithubStrategy],
  exports: [UserService],
})
export class UserModule {}
