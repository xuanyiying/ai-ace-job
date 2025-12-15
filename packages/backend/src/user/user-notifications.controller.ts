import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

interface UserNotificationDto {
  id: string;
  title: string;
  content: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  read: boolean;
  createdAt: string;
}

interface NotificationListResponse {
  data: UserNotificationDto[];
  total: number;
}

@ApiTags('user-notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('user/notifications')
export class UserNotificationsController {
  @Get()
  @ApiOperation({ summary: 'List user notifications' })
  @ApiResponse({
    status: 200,
    description: 'User notifications fetched successfully',
  })
  async listNotifications(
    @Request() _req: any,
    @Query('page') _page = 1,
    @Query('limit') _limit = 20
  ): Promise<NotificationListResponse> {
    return {
      data: [],
      total: 0,
    };
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read',
  })
  async markNotificationAsRead(
    @Request() _req: any,
    @Param('id') _id: string
  ): Promise<{ success: boolean }> {
    return { success: true };
  }

  @Put('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read',
  })
  async markAllNotificationsAsRead(
    @Request() _req: any
  ): Promise<{ success: boolean }> {
    return { success: true };
  }
}
