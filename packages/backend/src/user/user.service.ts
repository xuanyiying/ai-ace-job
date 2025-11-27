import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User, SubscriptionTier } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { Sanitizer } from '../common/utils/sanitizer';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  /**
   * Register a new user
   * Requirement 1.1: Create new user account with valid email and password
   * Requirement 1.5: Use bcrypt to hash passwords
   */
  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, password, username, phone } = registerDto;

    // Sanitize email
    const sanitizedEmail = Sanitizer.sanitizeEmail(email);

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: sanitizedEmail },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password using bcrypt
    const passwordHash = await bcrypt.hash(password, 10);

    // Sanitize optional fields
    const sanitizedUsername = username
      ? Sanitizer.sanitizeString(username)
      : undefined;
    const sanitizedPhone = phone ? Sanitizer.sanitizeString(phone) : undefined;

    // Create new user
    const user = await this.prisma.user.create({
      data: {
        email: sanitizedEmail,
        passwordHash,
        username: sanitizedUsername,
        phone: sanitizedPhone,
        subscriptionTier: SubscriptionTier.FREE,
        isActive: true,
        emailVerified: false,
      },
    });

    // Generate JWT token
    const accessToken = this.generateToken(user);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username ?? undefined,
        subscriptionTier: user.subscriptionTier,
        emailVerified: user.emailVerified,
      },
    };
  }

  /**
   * Login user
   * Requirement 1.2: Verify credentials and return authentication token
   */
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    // Sanitize email
    const sanitizedEmail = Sanitizer.sanitizeEmail(email);

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: sanitizedEmail },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login time
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate JWT token
    const accessToken = this.generateToken(user);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username ?? undefined,
        subscriptionTier: user.subscriptionTier,
        emailVerified: user.emailVerified,
      },
    };
  }

  /**
   * Verify JWT token and return user
   * Requirement 1.3: Verify authentication token
   */
  async verifyToken(token: string): Promise<User> {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid token');
      }

      return user;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * Delete user account
   * Requirement 1.4: Delete all associated data
   */
  async deleteAccount(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Cascade delete will handle related records
    await this.prisma.user.delete({
      where: { id: userId },
    });
  }

  /**
   * Update user subscription
   */
  async updateSubscription(
    userId: string,
    tier: SubscriptionTier
  ): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionTier: tier,
        subscriptionExpiresAt:
          tier !== SubscriptionTier.FREE
            ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
            : null,
      },
    });
  }

  /**
   * Generate JWT token for user
   */
  private generateToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      subscriptionTier: user.subscriptionTier,
    };

    return this.jwtService.sign(payload);
  }

  /**
   * Find user by ID
   */
  async findById(userId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Export user data for GDPR compliance
   * Requirement 1.4: Provide data export functionality
   */
  async exportUserData(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Fetch all user-related data
    const [resumes, jobs, optimizations, generatedPdfs] = await Promise.all([
      this.prisma.resume.findMany({
        where: { userId },
        select: {
          id: true,
          title: true,
          version: true,
          isPrimary: true,
          createdAt: true,
          updatedAt: true,
          parsedData: true,
        },
      }),
      this.prisma.job.findMany({
        where: { userId },
        select: {
          id: true,
          title: true,
          company: true,
          location: true,
          jobDescription: true,
          requirements: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.optimization.findMany({
        where: { userId },
        select: {
          id: true,
          resumeId: true,
          jobId: true,
          matchScore: true,
          suggestions: true,
          status: true,
          createdAt: true,
          completedAt: true,
        },
      }),
      this.prisma.generatedPDF.findMany({
        where: { userId },
        select: {
          id: true,
          templateId: true,
          downloadCount: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        phone: user.phone,
        subscriptionTier: user.subscriptionTier,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      resumes,
      jobs,
      optimizations,
      generatedPdfs,
      exportedAt: new Date(),
    };
  }
}
