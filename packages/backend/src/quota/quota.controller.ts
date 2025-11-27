import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { QuotaService, QuotaInfo } from './quota.service';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';

@Controller('quota')
@UseGuards(JwtAuthGuard)
export class QuotaController {
  constructor(private quotaService: QuotaService) {}

  /**
   * Get quota information for the current user
   * GET /api/v1/quota
   * Requirement 11.5: Display current usage and remaining quota
   */
  @Get()
  async getQuota(@Request() req: any): Promise<QuotaInfo> {
    return this.quotaService.getQuotaInfo(req.user.id);
  }
}
