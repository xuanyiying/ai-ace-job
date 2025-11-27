import { Controller, Get, Param, UseGuards, Logger } from '@nestjs/common';
import { GenerateService } from './generate.service';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

@ApiTags('Templates')
@ApiBearerAuth()
@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplatesController {
  private readonly logger = new Logger(TemplatesController.name);

  constructor(private generateService: GenerateService) {}

  /**
   * Get template by ID
   * GET /api/v1/templates/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get template by ID' })
  @ApiResponse({
    status: 200,
    description: 'Template retrieved successfully',
  })
  async getTemplate(@Param('id') templateId: string) {
    this.logger.log(`Fetching template ${templateId}`);

    const template = await this.generateService.getTemplate(templateId);

    return {
      success: true,
      data: template,
    };
  }

  /**
   * List all templates
   * GET /api/v1/templates
   */
  @Get()
  @ApiOperation({ summary: 'List all available templates' })
  @ApiResponse({
    status: 200,
    description: 'Templates retrieved successfully',
  })
  async listTemplates() {
    this.logger.log('Fetching all templates');

    const templates = await this.generateService.listTemplates();

    return {
      success: true,
      data: templates,
    };
  }
}
