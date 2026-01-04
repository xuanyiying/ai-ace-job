import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false, // Enforce token expiration
      secretOrKey: configService.get<string>('JWT_SECRET') || 'your-secret-key',
    });
  }

  async validate(payload: any) {
    // Validate payload structure
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }

    try {
      // Fetch user from database
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      // 🔍 DEBUG LOG: 检查从数据库获取的用户数据
      console.log('🔍 [JWT STRATEGY] User from database:', {
        userId: user?.id,
        email: user?.email,
        role: user?.role,
        roleType: typeof user?.role,
      });

      // Check if user exists and is active
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      if (!user.isActive) {
        throw new UnauthorizedException('User account is inactive');
      }

      // 🔍 DEBUG LOG: 检查返回给 req.user 的数据
      console.log('🔍 [JWT STRATEGY] Returning user to req.user:', {
        userId: user.id,
        email: user.email,
        role: user.role,
        roleType: typeof user.role,
      });

      // Return user object (will be attached to request.user)
      return user;
    } catch (error: any) {
      // Handle database connection errors specifically
      if (
        error.message &&
        error.message.includes(
          'Timed out fetching a new connection from the connection pool'
        )
      ) {
        throw new Error(
          'Service temporarily unavailable due to high load. Please try again later.'
        );
      }
      // Re-throw other errors
      throw error;
    }
  }
}
