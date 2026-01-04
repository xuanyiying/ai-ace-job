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
  Logger,
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
import { UserResponseDto } from './dto/user-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { GithubAuthGuard } from './guards/github-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class UserController {
  private readonly logger = new Logger(UserController.name);

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
  @ApiResponse({
    status: 200,
    description: 'User successfully logged out',
    schema: { example: { message: 'Successfully logged out' } },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async logout(@Request() req: any): Promise<{ message: string }> {
    // clean redis cache for user
    await this.userService.cleanUserCache(req.user.id);

    // JWT is stateless, so logout is primarily handled on the client side by removing the token
    // This endpoint can be used to perform server-side cleanup or token blacklisting if implemented
    return { message: 'Successfully logged out' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user' })
  @ApiResponse({
    status: 200,
    description: 'Current user information retrieved from database',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getCurrentUser(@Request() req: any): Promise<UserResponseDto> {
    console.log('🚀 [DEBUG] HIT GET_CURRENT_USER ENDPOINT');
    const user = await this.userService.findById(req.user.id);
    console.log(
      '🔍 [User Controller] User from database:',
      JSON.stringify(
        {
          userId: user?.id,
          email: user?.email,
          role: user?.role,
          roleType: typeof user?.role,
        },
        null,
        2
      )
    );
    return {
      id: user.id,
      email: user.email,
      username: user.username ?? undefined,
      role: user.role,
      subscriptionTier: user.subscriptionTier,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
    };
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
