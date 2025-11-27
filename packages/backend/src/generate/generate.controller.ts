import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import {
  GenerateService,
  PDFOptions,
  ParsedResumeData,
} from './generate.service';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

@ApiTags('PDF Generation')
@ApiBearerAuth()
@Controller('generate')
@UseGuards(JwtAuthGuard)
export class GenerateController {
  private readonly logger = new Logger(GenerateController.name);

  constructor(private generateService: GenerateService) {}

  /**
   * Generate PDF from resume
   * POST /api/v1/generate/pdf
   */
  @Post('pdf')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate PDF from resume' })
  @ApiResponse({
    status: 201,
    description: 'PDF generated successfully',
  })
  async generatePDF(
    @Request() req: any,
    @Body()
    body: {
      optimizationId: string;
      templateId: string;
      resumeData: ParsedResumeData;
      options: PDFOptions;
    }
  ) {
    this.logger.log(`Generating PDF for optimization ${body.optimizationId}`);

    const generatedPDF = await this.generateService.generatePDF(
      body.optimizationId,
      req.user.id,
      body.templateId,
      body.resumeData,
      body.options
    );

    return {
      success: true,
      data: generatedPDF,
    };
  }

  /**
   * Preview PDF as HTML
   * POST /api/v1/generate/preview
   */
  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Preview PDF as HTML' })
  @ApiResponse({
    status: 200,
    description: 'HTML preview returned successfully',
  })
  async previewPDF(
    @Request() req: any,
    @Body()
    body: {
      optimizationId: string;
      templateId: string;
      resumeData: ParsedResumeData;
      options: PDFOptions;
    }
  ) {
    this.logger.log(`Previewing PDF for optimization ${body.optimizationId}`);

    const html = await this.generateService.previewPDF(
      body.optimizationId,
      req.user.id,
      body.templateId,
      body.resumeData,
      body.options
    );

    return {
      success: true,
      data: { html },
    };
  }

  /**
   * Get generated PDF details
   * GET /api/v1/generate/pdfs/:id
   */
  @Get('pdfs/:id')
  @ApiOperation({ summary: 'Get generated PDF details' })
  @ApiResponse({
    status: 200,
    description: 'PDF details retrieved successfully',
  })
  async getGeneratedPDF(@Request() req: any, @Param('id') pdfId: string) {
    this.logger.log(`Fetching PDF details: ${pdfId}`);

    const pdf = await this.generateService.getGeneratedPDF(pdfId, req.user.id);

    return {
      success: true,
      data: pdf,
    };
  }

  /**
   * List generated PDFs for an optimization
   * GET /api/v1/generate/optimizations/:optimizationId/pdfs
   */
  @Get('optimizations/:optimizationId/pdfs')
  @ApiOperation({ summary: 'List generated PDFs for an optimization' })
  @ApiResponse({
    status: 200,
    description: 'PDFs retrieved successfully',
  })
  async listGeneratedPDFs(
    @Request() req: any,
    @Param('optimizationId') optimizationId: string
  ) {
    this.logger.log(`Fetching PDFs for optimization: ${optimizationId}`);

    const pdfs = await this.generateService.listGeneratedPDFs(
      optimizationId,
      req.user.id
    );

    return {
      success: true,
      data: pdfs,
    };
  }

  /**
   * Download PDF file
   * GET /api/v1/generate/pdfs/:id/download
   */
  @Get('pdfs/:id/download')
  @ApiOperation({ summary: 'Download PDF file' })
  @ApiResponse({
    status: 200,
    description: 'PDF file downloaded successfully',
  })
  async downloadPDF(
    @Request() req: any,
    @Param('id') pdfId: string,
    @Res() res: Response
  ) {
    this.logger.log(`Downloading PDF: ${pdfId}`);

    const buffer = await this.generateService.downloadPDF(pdfId, req.user.id);

    // Set response headers for file download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="resume-${pdfId}.pdf"`
    );
    res.setHeader('Content-Length', buffer.length);

    res.send(buffer);
  }

  /**
   * Delete generated PDF
   * DELETE /api/v1/generate/pdfs/:id
   */
  @Post('pdfs/:id/delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete generated PDF' })
  @ApiResponse({
    status: 200,
    description: 'PDF deleted successfully',
  })
  async deleteGeneratedPDF(@Request() req: any, @Param('id') pdfId: string) {
    this.logger.log(`Deleting PDF: ${pdfId}`);

    await this.generateService.deleteGeneratedPDF(pdfId, req.user.id);

    return {
      success: true,
      message: 'PDF deleted successfully',
    };
  }
}
