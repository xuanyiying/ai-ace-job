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
import { JwtAuthGuard } from './guards/jwt-auth.guard';

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
    return {
      id: req.user.id,
      email: req.user.email,
      username: req.user.username,
      subscriptionTier: req.user.subscriptionTier,
      emailVerified: req.user.emailVerified,
      createdAt: req.user.createdAt,
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
}
