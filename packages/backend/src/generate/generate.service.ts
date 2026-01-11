import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { StorageService } from '@/storage/storage.service';
import { QuotaService } from '@/quota/quota.service';
import { GeneratedPDF, Template } from '@prisma/client';
import { ParsedResumeData, ParsedJobData } from '@/types';
import * as puppeteer from 'puppeteer';
import * as Handlebars from 'handlebars';
import {
  FileType,
  UploadFileData,
} from '@/storage/interfaces/storage.interface';

export interface PDFOptions {
  fontSize: number;
  colorTheme: string;
  includePhoto: boolean;
  margin: 'normal' | 'compact' | 'wide';
  visibleSections: string[];
}

@Injectable()
class GenerateService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GenerateService.name);
  private browser: puppeteer.Browser | null = null;

  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private quotaService: QuotaService
  ) {}

  async onModuleInit(): Promise<void> {
    await this.initializeBrowser();
  }

  /**
   * Initialize Puppeteer browser instance
   * Reuses browser instance for performance
   */
  private async initializeBrowser(): Promise<void> {
    try {
      if (!this.browser) {
        this.logger.log('Initializing Puppeteer browser...');
        const launchOptions: puppeteer.PuppeteerLaunchOptions = {
          headless: 'new',
          pipe: true, // Use pipe instead of WebSocket for better reliability in some environments
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--font-render-hinting=none', // Better font rendering for PDFs
          ],
        };

        // Allow overriding executable path via env (Requirement 12.1)
        if (process.env.PUPPETEER_EXECUTABLE_PATH) {
          launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
          this.logger.log(
            `Using custom Puppeteer executable path: ${launchOptions.executablePath}`
          );
        }

        try {
          this.browser = await puppeteer.launch(launchOptions);
        } catch (launchError) {
          this.logger.warn(
            `Failed to launch Puppeteer with headless: 'new', trying legacy headless mode...`
          );
          launchOptions.headless = true;
          this.browser = await puppeteer.launch(launchOptions);
        }
        this.logger.log('Puppeteer browser initialized successfully');
      }
    } catch (error) {
      let errorMessage = 'Unknown error';
      let errorStack = '';

      if (error instanceof Error) {
        errorMessage = error.message;
        errorStack = error.stack || '';
      } else if (typeof error === 'object' && error !== null) {
        // Handle ErrorEvent or other object-like errors
        errorMessage =
          (error as any).message ||
          (error as any).error?.message ||
          JSON.stringify(error);
        errorStack = (error as any).stack || (error as any).error?.stack || '';
      } else {
        errorMessage = String(error);
      }

      this.logger.error(
        `Failed to initialize Puppeteer browser: ${errorMessage}`,
        errorStack
      );
    }
  }

  /**
   * Get browser instance, initializing if necessary
   */
  private async getBrowser(): Promise<puppeteer.Browser> {
    if (!this.browser) {
      await this.initializeBrowser();
    }

    if (!this.browser) {
      throw new Error('Failed to initialize Puppeteer browser');
    }

    return this.browser;
  }

  /**
   * Generate PDF from resume data
   * Validates template, renders HTML, and generates PDF
   * Requirement 7.1, 7.3
   * Requirement 11.2: Check PDF generation quota
   */
  async generatePDF(
    optimizationId: string,
    userId: string,
    templateId: string,
    resumeData: ParsedResumeData,
    options: PDFOptions
  ): Promise<GeneratedPDF> {
    try {
      // Check quota before generating PDF
      // Requirement 11.2: Free users limited to 5 PDFs per month
      // Requirement 11.3: Pro users have unlimited PDFs
      await this.quotaService.enforcePdfQuota(userId);

      // Verify user owns the optimization
      const optimization = await this.prisma.optimization.findUnique({
        where: { id: optimizationId },
      });

      if (!optimization || optimization.userId !== userId) {
        throw new ForbiddenException(
          'You do not have permission to access this optimization'
        );
      }

      // Get template
      const template = await this.prisma.template.findUnique({
        where: { id: templateId },
      });

      if (!template || !template.isActive) {
        throw new NotFoundException(`Template with ID ${templateId} not found`);
      }

      // Render HTML from template
      const html = this.renderTemplate(template, resumeData, options);

      // Generate PDF
      const pdfBuffer = await this.renderPDFFromHTML(html);

      // Validate PDF size (Requirement 7.4: max 2MB)
      const maxSizeBytes = 2 * 1024 * 1024; // 2MB
      if (pdfBuffer.length > maxSizeBytes) {
        throw new BadRequestException(
          `Generated PDF exceeds maximum size of 2MB (${(pdfBuffer.length / 1024 / 1024).toFixed(2)}MB)`
        );
      }

      // Upload PDF to storage (Requirement 7.7)
      const fileName = `resume-${optimizationId}-${Date.now()}.pdf`;
      const uploadData: UploadFileData = {
        originalName: fileName,
        mimetype: 'application/pdf',
        size: pdfBuffer.length,
        buffer: pdfBuffer,
        userId,
        fileType: FileType.DOCUMENT,
        category: 'resume',
      };
      const storageFile = await this.storageService.uploadFile(uploadData);

      // Set expiration date (24 hours from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      // Create generated PDF record
      const generatedPDF = await this.prisma.generatedPDF.create({
        data: {
          userId,
          optimizationId,
          templateId,
          fileUrl: storageFile.url,
          fileSize: pdfBuffer.length,
          downloadCount: 0,
          expiresAt,
        },
      });

      // Increment PDF generation counter for quota tracking
      await this.quotaService.incrementPdfCount(userId);

      this.logger.log(
        `PDF generated successfully for optimization ${optimizationId}`
      );

      return generatedPDF;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error generating PDF: ${errorMessage}`, error);
      throw error;
    }
  }

  /**
   * Generate PDF from Markdown content
   * Converts Markdown to HTML and generates PDF
   * Requirements: 3.1, 3.5
   */
  async generatePDFFromMarkdown(
    markdown: string,
    userId: string,
    options?: {
      fontSize?: number;
      margin?: { top: number; bottom: number; left: number; right: number };
    }
  ): Promise<{
    fileId: string;
    filePath: string;
    expiresAt: Date;
    downloadUrl: string;
  }> {
    try {
      // Check quota before generating PDF
      await this.quotaService.enforcePdfQuota(userId);

      // Convert Markdown to HTML
      const htmlContent = this.convertMarkdownToHTML(markdown);

      // Create styled HTML document
      const styledHtml = this.createStyledMarkdownHTML(htmlContent, options);

      // Generate PDF
      const pdfBuffer = await this.renderPDFFromHTML(styledHtml);

      // Validate PDF size (max 2MB)
      const maxSizeBytes = 2 * 1024 * 1024; // 2MB
      if (pdfBuffer.length > maxSizeBytes) {
        throw new BadRequestException(
          `Generated PDF exceeds maximum size of 2MB (${(pdfBuffer.length / 1024 / 1024).toFixed(2)}MB)`
        );
      }

      // Generate unique file ID
      const fileId = `markdown-pdf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const fileName = `resume-${fileId}.pdf`;

      // Upload PDF to storage
      const uploadData: UploadFileData = {
        originalName: fileName,
        mimetype: 'application/pdf',
        size: pdfBuffer.length,
        buffer: pdfBuffer,
        userId,
        fileType: FileType.DOCUMENT,
        category: 'resume',
      };
      const storageFile = await this.storageService.uploadFile(uploadData);

      // Set expiration date (24 hours from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      // Create temporary file record (we'll use a simple in-memory store or database)
      // For now, we'll create a GeneratedPDF record without optimizationId and templateId
      const generatedPDF = await this.prisma.generatedPDF.create({
        data: {
          userId,
          optimizationId: 'markdown-pdf', // Placeholder for markdown PDFs
          templateId: 'markdown-template', // Placeholder for markdown PDFs
          fileUrl: storageFile.url,
          fileSize: pdfBuffer.length,
          downloadCount: 0,
          expiresAt,
        },
      });

      // Increment PDF generation counter for quota tracking
      await this.quotaService.incrementPdfCount(userId);

      this.logger.log(`PDF generated from Markdown for user ${userId}`);

      return {
        fileId: generatedPDF.id,
        filePath: storageFile.url,
        expiresAt,
        downloadUrl: `/generate/pdfs/${generatedPDF.id}/download`,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error generating PDF from Markdown: ${errorMessage}`,
        error
      );
      throw error;
    }
  }

  /**
   * Preview PDF as HTML
   * Returns HTML string for client-side preview
   * Requirement 7.3
   */
  async previewPDF(
    optimizationId: string,
    userId: string,
    templateId: string,
    resumeData: ParsedResumeData,
    options: PDFOptions
  ): Promise<string> {
    try {
      // Verify user owns the optimization
      const optimization = await this.prisma.optimization.findUnique({
        where: { id: optimizationId },
      });

      if (!optimization || optimization.userId !== userId) {
        throw new ForbiddenException(
          'You do not have permission to access this optimization'
        );
      }

      // Get template
      const template = await this.prisma.template.findUnique({
        where: { id: templateId },
      });

      if (!template || !template.isActive) {
        throw new NotFoundException(`Template with ID ${templateId} not found`);
      }

      // Render and return HTML
      return this.renderTemplate(template, resumeData, options);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error previewing PDF: ${errorMessage}`, error);
      throw error;
    }
  }

  /**
   * Get template by ID
   */
  async getTemplate(templateId: string): Promise<Template> {
    const template = await this.prisma.template.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${templateId} not found`);
    }

    return template;
  }

  /**
   * List all active templates
   */
  async listTemplates(): Promise<Template[]> {
    return this.prisma.template.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Render template with resume data
   * Uses Handlebars to compile and render template
   */
  private renderTemplate(
    template: Template,
    resumeData: ParsedResumeData,
    options: PDFOptions
  ): string {
    try {
      // Register Handlebars helpers
      this.registerHandlebarsHelpers();

      // Get template HTML (stored in configuration or separate file)
      const templateHTML = this.getTemplateHTML(template.name);

      // Compile Handlebars template
      const compiledTemplate = Handlebars.compile(templateHTML);

      // Prepare data for template
      const templateData = {
        ...resumeData,
        options,
        theme: this.getThemeColors(options.colorTheme),
        margins: this.getMarginValues(options.margin),
      };

      // Render template
      return compiledTemplate(templateData);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error rendering template: ${errorMessage}`, error);
      throw new BadRequestException('Failed to render template');
    }
  }

  /**
   * Register custom Handlebars helpers
   */
  private registerHandlebarsHelpers(): void {
    Handlebars.registerHelper('add', (a: number, b: number) => a + b);
    Handlebars.registerHelper('subtract', (a: number, b: number) => a - b);
    Handlebars.registerHelper(
      'if_eq',
      function (this: any, a: any, b: any, opts: any) {
        return a === b ? opts.fn(this) : opts.inverse(this);
      }
    );
  }

  /**
   * Get template HTML based on template name
   * Returns the HTML template string
   */
  private getTemplateHTML(templateName: string): string {
    // In production, these would be stored in a database or file system
    const templates: Record<string, string> = {
      classic: this.getClassicTemplate(),
      modern: this.getModernTemplate(),
      professional: this.getProfessionalTemplate(),
    };

    const html = templates[templateName.toLowerCase()];
    if (!html) {
      throw new BadRequestException(`Template ${templateName} not found`);
    }

    return html;
  }

  /**
   * Get classic resume template
   */
  private getClassicTemplate(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; }
    body {
      font-family: 'Calibri', 'Arial', sans-serif;
      font-size: 11px;
      line-height: 1.6;
      color: #333;
      padding: 10mm 10mm 10mm 10mm;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 2px solid #0066cc;
      padding-bottom: 10px;
    }
    .name {
      font-size: 17px;
      font-weight: bold;
      color: #0066cc;
    }
    .contact {
      font-size: 9px;
      color: #666;
    }
    .section {
      margin-bottom: 15px;
    }
    .section-title {
      font-size: 13px;
      font-weight: bold;
      color: #0066cc;
      border-bottom: 1px solid #e6f0ff;
      padding-bottom: 5px;
      margin-bottom: 10px;
    }
    .entry {
      margin-bottom: 10px;
    }
    .entry-header {
      display: flex;
      justify-content: space-between;
      font-weight: bold;
    }
    .entry-subheader {
      color: #666;
      font-style: italic;
    }
    .skills {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .skill-tag {
      background-color: #0052a3;
      color: white;
      padding: 3px 8px;
      border-radius: 3px;
      font-size: 10px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="name">{{personalInfo.name}}</div>
    <div class="contact">
      {{personalInfo.email}}{{#if personalInfo.phone}} | {{personalInfo.phone}}{{/if}}{{#if personalInfo.location}} | {{personalInfo.location}}{{/if}}
    </div>
  </div>

  {{#if summary}}
  <div class="section">
    <div class="section-title">Professional Summary</div>
    <p>{{summary}}</p>
  </div>
  {{/if}}

  {{#if experience}}
  <div class="section">
    <div class="section-title">Experience</div>
    {{#each experience}}
    <div class="entry">
      <div class="entry-header">
        <span>{{this.position}}</span>
        <span>{{this.startDate}}{{#if this.endDate}} - {{this.endDate}}{{else}} - Present{{/if}}</span>
      </div>
      <div class="entry-subheader">{{this.company}}{{#if this.location}} | {{this.location}}{{/if}}</div>
      <ul>
        {{#each this.description}}
        <li>{{this}}</li>
        {{/each}}
      </ul>
    </div>
    {{/each}}
  </div>
  {{/if}}

  {{#if education}}
  <div class="section">
    <div class="section-title">Education</div>
    {{#each education}}
    <div class="entry">
      <div class="entry-header">
        <span>{{this.degree}} in {{this.field}}</span>
        <span>{{this.startDate}}{{#if this.endDate}} - {{this.endDate}}{{else}} - Present{{/if}}</span>
      </div>
      <div class="entry-subheader">{{this.institution}}</div>
    </div>
    {{/each}}
  </div>
  {{/if}}

  {{#if skills}}
  <div class="section">
    <div class="section-title">Skills</div>
    <div class="skills">
      {{#each skills}}
      <div class="skill-tag">{{this}}</div>
      {{/each}}
    </div>
  </div>
  {{/if}}

  {{#if projects}}
  <div class="section">
    <div class="section-title">Projects</div>
    {{#each projects}}
    <div class="entry">
      <div class="entry-header">
        <span>{{this.name}}</span>
      </div>
      <p>{{this.description}}</p>
    </div>
    {{/each}}
  </div>
  {{/if}}
</body>
</html>
    `;
  }

  /**
   * Get modern resume template
   */
  private getModernTemplate(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', 'Tahoma', sans-serif;
      font-size: 11px;
      line-height: 1.5;
      color: #2c3e50;
      padding: 10mm 10mm 10mm 10mm;
      background: white;
    }
    .container {
      display: grid;
      grid-template-columns: 1fr;
      gap: 20px;
    }
    .header {
      background: linear-gradient(135deg, #0066cc 0%, #e6f0ff 100%);
      color: white;
      padding: 30px;
      border-radius: 8px;
      text-align: center;
    }
    .name {
      font-size: 19px;
      font-weight: 700;
      margin-bottom: 10px;
    }
    .contact {
      font-size: 9px;
      opacity: 0.9;
    }
    .section {
      margin-bottom: 20px;
    }
    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: #0066cc;
      text-transform: uppercase;
      letter-spacing: 1px;
      padding-bottom: 8px;
      border-bottom: 3px solid #0052a3;
      margin-bottom: 12px;
    }
    .entry {
      margin-bottom: 12px;
      padding-left: 0;
    }
    .entry-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 4px;
    }
    .entry-title {
      font-weight: 600;
      color: #2c3e50;
    }
    .entry-date {
      font-size: 10px;
      color: #7f8c8d;
    }
    .entry-subtitle {
      color: #0066cc;
      font-size: 10px;
      margin-bottom: 4px;
    }
    .skills {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .skill-tag {
      background-color: #0052a3;
      color: white;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="name">{{personalInfo.name}}</div>
      <div class="contact">
        {{personalInfo.email}}{{#if personalInfo.phone}} • {{personalInfo.phone}}{{/if}}{{#if personalInfo.location}} • {{personalInfo.location}}{{/if}}
      </div>
    </div>

    {{#if summary}}
    <div class="section">
      <div class="section-title">About</div>
      <p>{{summary}}</p>
    </div>
    {{/if}}

    {{#if experience}}
    <div class="section">
      <div class="section-title">Experience</div>
      {{#each experience}}
      <div class="entry">
        <div class="entry-header">
          <span class="entry-title">{{this.position}}</span>
          <span class="entry-date">{{this.startDate}} - {{#if this.endDate}}{{this.endDate}}{{else}}Present{{/if}}</span>
        </div>
        <div class="entry-subtitle">{{this.company}}{{#if this.location}} • {{this.location}}{{/if}}</div>
        <ul style="margin-left: 20px;">
          {{#each this.description}}
          <li>{{this}}</li>
          {{/each}}
        </ul>
      </div>
      {{/each}}
    </div>
    {{/if}}

    {{#if education}}
    <div class="section">
      <div class="section-title">Education</div>
      {{#each education}}
      <div class="entry">
        <div class="entry-header">
          <span class="entry-title">{{this.degree}} in {{this.field}}</span>
          <span class="entry-date">{{this.startDate}}{{#if this.endDate}} - {{this.endDate}}{{/if}}</span>
        </div>
        <div class="entry-subtitle">{{this.institution}}</div>
      </div>
      {{/each}}
    </div>
    {{/if}}

    {{#if skills}}
    <div class="section">
      <div class="section-title">Skills</div>
      <div class="skills">
        {{#each skills}}
        <div class="skill-tag">{{this}}</div>
        {{/each}}
      </div>
    </div>
    {{/if}}
  </div>
</body>
</html>
    `;
  }

  /**
   * Get professional resume template
   */
  private getProfessionalTemplate(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; }
    body {
      font-family: 'Georgia', serif;
      font-size: 11px;
      line-height: 1.7;
      color: #1a1a1a;
      padding: 10mm 10mm 10mm 10mm;
    }
    .header {
      text-align: center;
      margin-bottom: 25px;
      padding-bottom: 15px;
      border-bottom: 3px solid #0066cc;
    }
    .name {
      font-size: 18px;
      font-weight: bold;
      color: #0066cc;
      letter-spacing: 2px;
    }
    .contact {
      font-size: 9px;
      color: #555;
      margin-top: 5px;
    }
    .section {
      margin-bottom: 18px;
    }
    .section-title {
      font-size: 13px;
      font-weight: bold;
      color: #0066cc;
      text-transform: uppercase;
      letter-spacing: 1px;
      padding-bottom: 8px;
      border-bottom: 1px solid #0066cc;
      margin-bottom: 12px;
    }
    .entry {
      margin-bottom: 12px;
    }
    .entry-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 3px;
    }
    .entry-title {
      font-weight: bold;
      color: #1a1a1a;
    }
    .entry-date {
      font-size: 10px;
      color: #666;
    }
    .entry-subtitle {
      color: #0066cc;
      font-style: italic;
      font-size: 10px;
    }
    .skills {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }
    .skill-item {
      padding: 2px 6px;
      border: 1px solid #0066cc;
      color: #0066cc;
      font-size: 10px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="name">{{personalInfo.name}}</div>
    <div class="contact">
      {{personalInfo.email}}{{#if personalInfo.phone}} | {{personalInfo.phone}}{{/if}}{{#if personalInfo.location}} | {{personalInfo.location}}{{/if}}
    </div>
  </div>

  {{#if summary}}
  <div class="section">
    <div class="section-title">Professional Summary</div>
    <p>{{summary}}</p>
  </div>
  {{/if}}

  {{#if experience}}
  <div class="section">
    <div class="section-title">Professional Experience</div>
    {{#each experience}}
    <div class="entry">
      <div class="entry-header">
        <span class="entry-title">{{this.position}}</span>
        <span class="entry-date">{{this.startDate}} – {{#if this.endDate}}{{this.endDate}}{{else}}Present{{/if}}</span>
      </div>
      <div class="entry-subtitle">{{this.company}}{{#if this.location}} • {{this.location}}{{/if}}</div>
      <ul style="margin-left: 20px; margin-top: 4px;">
        {{#each this.description}}
        <li>{{this}}</li>
        {{/each}}
      </ul>
    </div>
    {{/each}}
  </div>
  {{/if}}

  {{#if education}}
  <div class="section">
    <div class="section-title">Education</div>
    {{#each education}}
    <div class="entry">
      <div class="entry-header">
        <span class="entry-title">{{this.degree}} in {{this.field}}</span>
        <span class="entry-date">{{this.startDate}}{{#if this.endDate}} – {{this.endDate}}{{/if}}</span>
      </div>
      <div class="entry-subtitle">{{this.institution}}</div>
    </div>
    {{/each}}
  </div>
  {{/if}}

  {{#if skills}}
  <div class="section">
    <div class="section-title">Core Competencies</div>
    <div class="skills">
      {{#each skills}}
      <div class="skill-item">{{this}}</div>
      {{/each}}
    </div>
  </div>
  {{/if}}
</body>
</html>
    `;
  }

  /**
   * Create styled HTML document from Markdown content
   * Wraps the converted HTML with professional styling
   */
  private createStyledMarkdownHTML(
    htmlContent: string,
    options?: {
      fontSize?: number;
      margin?: { top: number; bottom: number; left: number; right: number };
    }
  ): string {
    const fontSize = options?.fontSize || 12;
    const margin = options?.margin || {
      top: 20,
      bottom: 20,
      left: 20,
      right: 20,
    };

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resume</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', 'Calibri', 'Arial', sans-serif;
      font-size: ${fontSize}px;
      line-height: 1.6;
      color: #333;
      padding: ${margin.top}mm ${margin.right}mm ${margin.bottom}mm ${margin.left}mm;
      background: white;
    }
    
    h1 {
      font-size: ${fontSize + 6}px;
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 3px solid #3498db;
    }
    
    h2 {
      font-size: ${fontSize + 4}px;
      font-weight: 600;
      color: #2c3e50;
      margin-top: 24px;
      margin-bottom: 12px;
      padding-bottom: 4px;
      border-bottom: 2px solid #3498db;
    }
    
    h3 {
      font-size: ${fontSize + 2}px;
      font-weight: 600;
      color: #34495e;
      margin-top: 16px;
      margin-bottom: 8px;
    }
    
    h4, h5, h6 {
      font-size: ${fontSize + 1}px;
      font-weight: 600;
      color: #34495e;
      margin-top: 12px;
      margin-bottom: 6px;
    }
    
    p {
      margin-bottom: 12px;
      text-align: justify;
    }
    
    ul, ol {
      margin-left: 20px;
      margin-bottom: 12px;
    }
    
    li {
      margin-bottom: 4px;
    }
    
    strong, b {
      font-weight: 600;
      color: #2c3e50;
    }
    
    em, i {
      font-style: italic;
      color: #34495e;
    }
    
    blockquote {
      border-left: 4px solid #3498db;
      padding-left: 16px;
      margin: 16px 0;
      font-style: italic;
      color: #555;
    }
    
    code {
      background-color: #f8f9fa;
      padding: 2px 4px;
      border-radius: 3px;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: ${fontSize - 1}px;
    }
    
    pre {
      background-color: #f8f9fa;
      padding: 12px;
      border-radius: 6px;
      overflow-x: auto;
      margin: 12px 0;
    }
    
    pre code {
      background: none;
      padding: 0;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
    }
    
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    
    th {
      background-color: #f8f9fa;
      font-weight: 600;
    }
    
    hr {
      border: none;
      border-top: 1px solid #ddd;
      margin: 24px 0;
    }
    
    a {
      color: #3498db;
      text-decoration: none;
    }
    
    a:hover {
      text-decoration: underline;
    }
    
    /* Print-specific styles */
    @media print {
      body {
        font-size: ${fontSize}px;
      }
      
      h1, h2, h3, h4, h5, h6 {
        page-break-after: avoid;
      }
      
      p, li {
        page-break-inside: avoid;
      }
      
      blockquote, pre {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>
    `;
  }

  /**
   * Simple Markdown to HTML converter
   * Converts basic markdown syntax to HTML
   */
  private convertMarkdownToHTML(markdown: string): string {
    let html = markdown;

    // Convert headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Convert bold and italic
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Convert code
    html = html.replace(/`(.*?)`/g, '<code>$1</code>');

    // Convert links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // Convert line breaks to paragraphs
    const paragraphs = html.split('\n\n');
    html = paragraphs
      .map((paragraph) => {
        if (paragraph.trim() === '') return '';
        if (
          paragraph.startsWith('<h') ||
          paragraph.startsWith('<ul') ||
          paragraph.startsWith('<ol')
        ) {
          return paragraph;
        }

        // Handle lists
        if (paragraph.includes('\n- ') || paragraph.includes('\n* ')) {
          const lines = paragraph.split('\n');
          let listHtml = '<ul>';
          for (const line of lines) {
            if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
              listHtml += `<li>${line.trim().substring(2)}</li>`;
            } else if (line.trim()) {
              listHtml += `<li>${line.trim()}</li>`;
            }
          }
          listHtml += '</ul>';
          return listHtml;
        }

        return `<p>${paragraph.replace(/\n/g, '<br>')}</p>`;
      })
      .filter((p) => p !== '')
      .join('\n');

    return html;
  }

  /**
   * Render HTML to PDF using Puppeteer
   * Requirement 7.1: Generate PDF within 10 seconds
   */
  private async renderPDFFromHTML(html: string): Promise<Buffer> {
    let page: puppeteer.Page | null = null;

    try {
      const browser = await this.getBrowser();
      page = await browser.newPage();

      // Set viewport for consistent rendering
      await page.setViewport({ width: 1200, height: 1600 });

      // Set content
      await page.setContent(html, { waitUntil: 'networkidle0' });

      // Generate PDF with ATS-friendly settings (Requirement 7.5)
      return await page.pdf({
        format: 'A4',
        margin: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm',
        },
        printBackground: true,
        preferCSSPageSize: true,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error rendering PDF from HTML: ${errorMessage}`,
        error
      );
      throw new BadRequestException('Failed to generate PDF');
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  /**
   * Get theme colors based on color theme name
   */
  private getThemeColors(colorTheme: string): Record<string, string> {
    const themes: Record<string, Record<string, string>> = {
      blue: {
        primary: '#0066cc',
        secondary: '#e6f0ff',
        accent: '#0052a3',
      },
      green: {
        primary: '#00a86b',
        secondary: '#e6f9f0',
        accent: '#008c5a',
      },
      red: {
        primary: '#cc0000',
        secondary: '#ffe6e6',
        accent: '#990000',
      },
      purple: {
        primary: '#7b2cbf',
        secondary: '#f3e5ff',
        accent: '#5a1e99',
      },
      gray: {
        primary: '#333333',
        secondary: '#f0f0f0',
        accent: '#666666',
      },
    };

    return themes[colorTheme.toLowerCase()] || themes.blue;
  }

  /**
   * Get margin values based on margin preset
   */
  private getMarginValues(
    margin: 'normal' | 'compact' | 'wide'
  ): Record<string, number> {
    const margins: Record<string, Record<string, number>> = {
      normal: { top: 10, right: 10, bottom: 10, left: 10 },
      compact: { top: 8, right: 8, bottom: 8, left: 8 },
      wide: { top: 15, right: 15, bottom: 15, left: 15 },
    };

    return margins[margin] || margins.normal;
  }

  /**
   * Download PDF file
   * Increments download count and returns file buffer
   * Requirement 7.7: Download link generation and download counting
   *
   * @param pdfId - Generated PDF ID
   * @param userId - User ID for authorization
   * @returns File buffer
   */
  async downloadPDF(pdfId: string, userId: string): Promise<Buffer> {
    try {
      // Get PDF record
      const generatedPDF = await this.prisma.generatedPDF.findUnique({
        where: { id: pdfId },
      });

      if (!generatedPDF) {
        throw new NotFoundException(`PDF with ID ${pdfId} not found`);
      }

      // Verify user owns the PDF
      if (generatedPDF.userId !== userId) {
        throw new ForbiddenException(
          'You do not have permission to access this PDF'
        );
      }

      // Check if PDF has expired
      if (generatedPDF.expiresAt && generatedPDF.expiresAt < new Date()) {
        throw new BadRequestException('This PDF has expired');
      }

      // Extract file name from URL
      const fileName = generatedPDF.fileUrl.split('/').pop();
      if (!fileName) {
        throw new BadRequestException('Invalid PDF file URL');
      }

      // Download file from storage
      const storageFile = await this.storageService.downloadFile(pdfId, userId);

      // Increment download count
      await this.prisma.generatedPDF.update({
        where: { id: pdfId },
        data: {
          downloadCount: {
            increment: 1,
          },
        },
      });

      this.logger.log(`PDF downloaded: ${pdfId}, download count incremented`);

      return storageFile.buffer;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error downloading PDF: ${errorMessage}`, error);
      throw error;
    }
  }

  /**
   * Get generated PDF details
   *
   * @param pdfId - Generated PDF ID
   * @param userId - User ID for authorization
   * @returns Generated PDF record
   */
  async getGeneratedPDF(pdfId: string, userId: string): Promise<GeneratedPDF> {
    try {
      const generatedPDF = await this.prisma.generatedPDF.findUnique({
        where: { id: pdfId },
      });

      if (!generatedPDF) {
        throw new NotFoundException(`PDF with ID ${pdfId} not found`);
      }

      // Verify user owns the PDF
      if (generatedPDF.userId !== userId) {
        throw new ForbiddenException(
          'You do not have permission to access this PDF'
        );
      }

      return generatedPDF;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error getting PDF details: ${errorMessage}`, error);
      throw error;
    }
  }

  /**
   * List generated PDFs for an optimization
   *
   * @param optimizationId - Optimization ID
   * @param userId - User ID for authorization
   * @returns List of generated PDFs
   */
  async listGeneratedPDFs(
    optimizationId: string,
    userId: string
  ): Promise<GeneratedPDF[]> {
    try {
      // Verify user owns the optimization
      const optimization = await this.prisma.optimization.findUnique({
        where: { id: optimizationId },
      });

      if (!optimization || optimization.userId !== userId) {
        throw new ForbiddenException(
          'You do not have permission to access this optimization'
        );
      }

      // Get all PDFs for this optimization
      const pdfs = await this.prisma.generatedPDF.findMany({
        where: { optimizationId },
        orderBy: { createdAt: 'desc' },
      });

      return pdfs;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error listing generated PDFs: ${errorMessage}`, error);
      throw error;
    }
  }

  /**
   * Delete generated PDF
   * Removes file from storage and database record
   *
   * @param pdfId - Generated PDF ID
   * @param userId - User ID for authorization
   */
  async deleteGeneratedPDF(pdfId: string, userId: string): Promise<void> {
    try {
      // Get PDF record
      const generatedPDF = await this.prisma.generatedPDF.findUnique({
        where: { id: pdfId },
      });

      if (!generatedPDF) {
        throw new NotFoundException(`PDF with ID ${pdfId} not found`);
      }

      // Verify user owns the PDF
      if (generatedPDF.userId !== userId) {
        throw new ForbiddenException(
          'You do not have permission to delete this PDF'
        );
      }
      await this.storageService.deleteFile(pdfId, userId);

      // Delete database record
      await this.prisma.generatedPDF.delete({
        where: { id: pdfId },
      });

      this.logger.log(`PDF deleted: ${pdfId}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error deleting PDF: ${errorMessage}`, error);
      throw error;
    }
  }

  /**
   * Clean up expired files (alias for cleanupExpiredPDFs)
   * Requirement 3.6: Cleanup expired temporary PDF files
   */
  async cleanupExpiredFiles(): Promise<number> {
    return this.cleanupExpiredPDFs();
  }

  /**
   * Clean up expired PDFs
   * Deletes PDFs that have passed their expiration date
   * Requirement 7.7: File expiration management
   *
   * @returns Number of PDFs deleted
   */
  async cleanupExpiredPDFs(): Promise<number> {
    try {
      const now = new Date();

      // Find all expired PDFs
      const expiredPDFs = await this.prisma.generatedPDF.findMany({
        where: {
          expiresAt: {
            lt: now,
          },
        },
      });

      let deletedCount = 0;

      // Delete each expired PDF
      for (const pdf of expiredPDFs) {
        try {
          await this.storageService.deleteFile(pdf.id, pdf.userId);
          // Delete database record
          await this.prisma.generatedPDF.delete({
            where: { id: pdf.id },
          });

          deletedCount++;
          this.logger.log(`Deleted expired PDF: ${pdf.id}`);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.logger.warn(
            `Error deleting expired PDF ${pdf.id}: ${errorMessage}`
          );
        }
      }

      this.logger.log(
        `Cleanup completed: ${deletedCount} expired PDFs deleted`
      );
      return deletedCount;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error cleaning up expired PDFs: ${errorMessage}`);
      return 0;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.browser) {
      this.logger.log('Closing Puppeteer browser...');
      await this.browser.close();
      this.browser = null;
    }
  }
}

export default GenerateService;
