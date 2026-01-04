import {
  Controller,
  Post,
  Body,
  Get,
  Delete,
  Put,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { UserDataExportDto } from './dto/user-data-export.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { GithubAuthGuard } from './guards/github-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.userService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged in',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.userService.login(loginDto);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address' })
  @ApiResponse({ status: 200, description: 'Email successfully verified' })
  @ApiResponse({ status: 404, description: 'Invalid token' })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto): Promise<void> {
    return this.userService.verifyEmail(verifyEmailDto.token);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200, description: 'Password reset email sent' })
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto
  ): Promise<void> {
    return this.userService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password' })
  @ApiResponse({ status: 200, description: 'Password successfully reset' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto
  ): Promise<void> {
    return this.userService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword
    );
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'User successfully logged out' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(): Promise<{ message: string }> {
    // JWT is stateless, so logout is handled on the client side
    // This endpoint exists for API consistency and future token blacklist implementation
    return { message: 'Successfully logged out' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user' })
  @ApiResponse({ status: 200, description: 'Current user information' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentUser(@Request() req: any) {
    // 🔍 DEBUG LOG: 检查 JWT Guard 解析出的用户数据
    console.log('🔍 [GET /auth/me] User from JWT:', {
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      roleType: typeof req.user.role,
      fullUser: req.user,
    });

    const response = {
      id: req.user.id,
      email: req.user.email,
      username: req.user.username,
      role: req.user.role, // ✅ 添加 role 字段
      subscriptionTier: req.user.subscriptionTier,
      emailVerified: req.user.emailVerified,
      createdAt: req.user.createdAt,
    };

    // 🔍 DEBUG LOG: 检查返回的响应数据
    console.log('🔍 [GET /auth/me] Response data:', {
      userId: response.id,
      email: response.email,
      role: response.role,
      roleType: typeof response.role,
    });

    return response;
  }

  @Delete('account')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user account' })
  @ApiResponse({ status: 204, description: 'Account successfully deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteAccount(@Request() req: any): Promise<void> {
    await this.userService.deleteAccount(req.user.id);
  }

  @Put('subscription')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user subscription' })
  @ApiResponse({
    status: 200,
    description: 'Subscription successfully updated',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateSubscription(
    @Request() req: any,
    @Body() updateSubscriptionDto: UpdateSubscriptionDto
  ) {
    const user = await this.userService.updateSubscription(
      req.user.id,
      updateSubscriptionDto.tier
    );
    return {
      id: user.id,
      email: user.email,
      subscriptionTier: user.subscriptionTier,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
    };
  }

  @Get('data/export')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export user data for GDPR compliance' })
  @ApiResponse({
    status: 200,
    description: 'User data successfully exported',
    type: UserDataExportDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async exportUserData(@Request() req: any): Promise<UserDataExportDto> {
    return this.userService.exportUserData(req.user.id);
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth login' })
  async googleAuth(@Req() _req: any) {
    // Guard redirects to Google
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleAuthRedirect(@Req() req: any, @Res() res: any) {
    try {
      const { accessToken } = await this.userService.login({
        email: req.user.email,
        password: '', // Password not needed for OAuth login response generation
      } as LoginDto);

      // Redirect to frontend with token
      const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/oauth/callback?token=${accessToken}`);
    } catch (error: any) {
      const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:5173';
      res.redirect(
        `${frontendUrl}/oauth/callback?error=${encodeURIComponent(error.message)}`
      );
    }
  }

  @Get('github')
  @UseGuards(GithubAuthGuard)
  @ApiOperation({ summary: 'GitHub OAuth login' })
  async githubAuth(@Req() _req: any) {
    // Guard redirects to GitHub
  }

  @Get('github/callback')
  @UseGuards(GithubAuthGuard)
  @ApiOperation({ summary: 'GitHub OAuth callback' })
  async githubAuthRedirect(@Req() req: any, @Res() res: any) {
    try {
      const { accessToken } = await this.userService.login({
        email: req.user.email,
        password: '', // Password not needed for OAuth login response generation
      } as LoginDto);

      const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/oauth/callback?token=${accessToken}`);
    } catch (error: any) {
      const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:5173';
      res.redirect(
        `${frontendUrl}/oauth/callback?error=${encodeURIComponent(error.message)}`
      );
    }
  }
}

@ApiTags('user')
@Controller('user')
export class UserHistoryController {
  constructor(private readonly userService: UserService) {}

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user activity history' })
  @ApiResponse({ status: 200, description: 'User activity history' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserHistory(
    @Request() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20'
  ) {
    return this.userService.getUserHistory(
      req.user.id,
      parseInt(page, 10),
      parseInt(limit, 10)
    );
  }
}
