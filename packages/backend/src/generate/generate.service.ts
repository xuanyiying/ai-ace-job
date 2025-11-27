import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { QuotaService } from '../quota/quota.service';
import { GeneratedPDF, Template } from '@prisma/client';
import * as puppeteer from 'puppeteer';
import * as Handlebars from 'handlebars';

export interface PDFOptions {
  fontSize: number;
  colorTheme: string;
  includePhoto: boolean;
  margin: 'normal' | 'compact' | 'wide';
  visibleSections: string[];
}

export interface ParsedResumeData {
  personalInfo: {
    name: string;
    email: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    github?: string;
    website?: string;
  };
  summary?: string;
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    startDate: string;
    endDate?: string;
    gpa?: string;
    achievements?: string[];
  }>;
  experience: Array<{
    company: string;
    position: string;
    startDate: string;
    endDate?: string;
    location?: string;
    description: string[];
    achievements?: string[];
  }>;
  skills: string[];
  projects: Array<{
    name: string;
    description: string;
    technologies: string[];
    startDate?: string;
    endDate?: string;
    url?: string;
    highlights: string[];
  }>;
  certifications?: Array<{
    name: string;
    issuer: string;
    date: string;
    expiryDate?: string;
    credentialId?: string;
  }>;
  languages?: Array<{
    name: string;
    proficiency: string;
  }>;
}

@Injectable()
export class GenerateService {
  private readonly logger = new Logger(GenerateService.name);
  private browser: puppeteer.Browser | null = null;

  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private quotaService: QuotaService
  ) {
    this.initializeBrowser();
  }

  /**
   * Initialize Puppeteer browser instance
   * Reuses browser instance for performance
   */
  private async initializeBrowser(): Promise<void> {
    try {
      if (!this.browser) {
        this.browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
      }
    } catch (error) {
      this.logger.error('Failed to initialize Puppeteer browser:', error);
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
      const fileUrl = await this.storageService.uploadPDF(fileName, pdfBuffer);

      // Set expiration date (90 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 90);

      // Create generated PDF record
      const generatedPDF = await this.prisma.generatedPDF.create({
        data: {
          userId,
          optimizationId,
          templateId,
          fileUrl,
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
<html>
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
<html>
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
<html>
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
      const pdfBuffer = await page.pdf({
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

      return pdfBuffer;
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
      const buffer = await this.storageService.downloadPDF(fileName);

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

      return buffer;
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

      // Extract file name from URL
      const fileName = generatedPDF.fileUrl.split('/').pop();
      if (fileName) {
        // Delete file from storage
        await this.storageService.deletePDF(fileName);
      }

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
          // Extract file name from URL
          const fileName = pdf.fileUrl.split('/').pop();
          if (fileName) {
            // Delete file from storage
            await this.storageService.deletePDF(fileName);
          }

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
      this.logger.error(
        `Error cleaning up expired PDFs: ${errorMessage}`,
        error
      );
      throw error;
    }
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }
}
