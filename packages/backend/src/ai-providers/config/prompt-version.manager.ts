import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PromptTemplateVersion } from '../interfaces/prompt-template.interface';
import * as crypto from 'crypto';

/**
 * Prompt Version Manager
 * Manages prompt template versions, A/B testing, and sensitive information encryption
 * Requirements: 4.7, 10.1, 10.2, 10.3, 10.4, 10.5
 */
@Injectable()
export class PromptVersionManager {
  private readonly logger = new Logger(PromptVersionManager.name);
  private readonly encryptionKey =
    process.env.ENCRYPTION_KEY || 'default-key-change-in-production';

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new version of a template
   * Property 53: Prompt template version creation
   * Validates: Requirements 10.1
   */
  async createVersion(
    templateId: string,
    content: string,
    author: string,
    reason?: string,
    isSensitive: boolean = false
  ): Promise<PromptTemplateVersion> {
    try {
      // Get the next version number
      const lastVersion = await this.prisma.promptTemplateVersion.findFirst({
        where: { templateId },
        orderBy: { version: 'desc' },
      });

      const nextVersion = (lastVersion?.version || 0) + 1;

      // Encrypt content if it contains sensitive information
      const processedContent = isSensitive
        ? this.encryptContent(content)
        : content;

      // Create new version
      const version = await this.prisma.promptTemplateVersion.create({
        data: {
          templateId,
          version: nextVersion,
          content: processedContent,
          variables: this.extractVariables(content),
          author,
          reason: reason || 'Version update',
          isActive: false,
        },
      });

      this.logger.log(
        `Created version ${nextVersion} for template ${templateId} by ${author}`
      );

      return version as PromptTemplateVersion;
    } catch (error) {
      this.logger.error('Failed to create template version:', error);
      throw error;
    }
  }

  /**
   * Get a specific version of a template
   * Property 55: Version selection
   * Validates: Requirements 10.3
   */
  async getVersion(
    templateId: string,
    version: number
  ): Promise<PromptTemplateVersion | null> {
    try {
      const versionRecord = await this.prisma.promptTemplateVersion.findUnique({
        where: {
          templateId_version: {
            templateId,
            version,
          },
        },
      });

      if (!versionRecord) {
        this.logger.warn(
          `Version ${version} not found for template ${templateId}`
        );
        return null;
      }

      // Decrypt content if it was encrypted
      const decryptedContent = this.isEncrypted(versionRecord.content)
        ? this.decryptContent(versionRecord.content)
        : versionRecord.content;

      return {
        ...versionRecord,
        content: decryptedContent,
      } as PromptTemplateVersion;
    } catch (error) {
      this.logger.error(
        `Failed to get version ${version} for template ${templateId}:`,
        error
      );
      return null;
    }
  }

  /**
   * List all versions of a template with metadata
   * Property 54: Version metadata recording
   * Validates: Requirements 10.2
   */
  async listVersions(templateId: string): Promise<PromptTemplateVersion[]> {
    try {
      const versions = await this.prisma.promptTemplateVersion.findMany({
        where: { templateId },
        orderBy: { version: 'desc' },
      });

      return versions.map((v) => ({
        ...v,
        content: this.isEncrypted(v.content)
          ? this.decryptContent(v.content)
          : v.content,
      })) as PromptTemplateVersion[];
    } catch (error) {
      this.logger.error(
        `Failed to list versions for template ${templateId}:`,
        error
      );
      return [];
    }
  }

  /**
   * Rollback to a specific version
   * Property 57: Version rollback
   * Validates: Requirements 10.5
   */
  async rollback(
    templateId: string,
    version: number
  ): Promise<PromptTemplateVersion | null> {
    try {
      const targetVersion = await this.prisma.promptTemplateVersion.findUnique({
        where: {
          templateId_version: {
            templateId,
            version,
          },
        },
      });

      if (!targetVersion) {
        this.logger.warn(
          `Version ${version} not found for template ${templateId}`
        );
        return null;
      }

      // Update the main template to use this version
      await this.prisma.promptTemplate.update({
        where: { id: templateId },
        data: {
          template: targetVersion.content,
          variables: targetVersion.variables,
          version,
        },
      });

      this.logger.log(
        `Rolled back template ${templateId} to version ${version}`
      );

      return targetVersion as PromptTemplateVersion;
    } catch (error) {
      this.logger.error(
        `Failed to rollback template ${templateId} to version ${version}:`,
        error
      );
      return null;
    }
  }

  /**
   * Create an A/B test between two versions
   * Property 56: A/B testing support
   * Validates: Requirements 10.4
   */
  async createABTest(
    templateId: string,
    versionA: number,
    versionB: number,
    testName: string,
    description?: string
  ): Promise<{
    testId: string;
    versionA: number;
    versionB: number;
    testName: string;
    createdAt: Date;
  }> {
    try {
      // Verify both versions exist
      const versionARecord = await this.prisma.promptTemplateVersion.findUnique(
        {
          where: {
            templateId_version: {
              templateId,
              version: versionA,
            },
          },
        }
      );

      const versionBRecord = await this.prisma.promptTemplateVersion.findUnique(
        {
          where: {
            templateId_version: {
              templateId,
              version: versionB,
            },
          },
        }
      );

      if (!versionARecord || !versionBRecord) {
        throw new Error('One or both versions not found');
      }

      // Store A/B test metadata in audit log
      const testId = crypto.randomUUID();
      await this.prisma.auditLog.create({
        data: {
          action: 'CREATE_AB_TEST',
          resource: `template:${templateId}`,
          details: {
            testId,
            versionA,
            versionB,
            testName,
            description,
          },
        },
      });

      this.logger.log(
        `Created A/B test ${testId} for template ${templateId} (v${versionA} vs v${versionB})`
      );

      return {
        testId,
        versionA,
        versionB,
        testName,
        createdAt: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to create A/B test:', error);
      throw error;
    }
  }

  /**
   * Get A/B test results
   */
  async getABTestResults(testId: string): Promise<any> {
    try {
      const testLog = await this.prisma.auditLog.findFirst({
        where: {
          action: 'CREATE_AB_TEST',
          details: {
            path: ['testId'],
            equals: testId,
          },
        },
      });

      if (!testLog) {
        this.logger.warn(`A/B test ${testId} not found`);
        return null;
      }

      return testLog.details;
    } catch (error) {
      this.logger.error(`Failed to get A/B test results for ${testId}:`, error);
      return null;
    }
  }

  /**
   * Activate a specific version
   */
  async activateVersion(
    templateId: string,
    version: number
  ): Promise<PromptTemplateVersion | null> {
    try {
      // Deactivate all other versions
      await this.prisma.promptTemplateVersion.updateMany({
        where: { templateId },
        data: { isActive: false },
      });

      // Activate the target version
      const activated = await this.prisma.promptTemplateVersion.update({
        where: {
          templateId_version: {
            templateId,
            version,
          },
        },
        data: { isActive: true },
      });

      this.logger.log(
        `Activated version ${version} for template ${templateId}`
      );

      return activated as PromptTemplateVersion;
    } catch (error) {
      this.logger.error(
        `Failed to activate version ${version} for template ${templateId}:`,
        error
      );
      return null;
    }
  }

  /**
   * Get version history with metadata
   */
  async getVersionHistory(
    templateId: string,
    limit: number = 10
  ): Promise<PromptTemplateVersion[]> {
    try {
      const versions = await this.prisma.promptTemplateVersion.findMany({
        where: { templateId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return versions.map((v) => ({
        ...v,
        content: this.isEncrypted(v.content) ? '[ENCRYPTED]' : v.content,
      })) as PromptTemplateVersion[];
    } catch (error) {
      this.logger.error(
        `Failed to get version history for template ${templateId}:`,
        error
      );
      return [];
    }
  }

  /**
   * Compare two versions
   */
  async compareVersions(
    templateId: string,
    versionA: number,
    versionB: number
  ): Promise<{
    versionA: PromptTemplateVersion | null;
    versionB: PromptTemplateVersion | null;
    differences: string[];
  }> {
    try {
      const vA = await this.getVersion(templateId, versionA);
      const vB = await this.getVersion(templateId, versionB);

      const differences: string[] = [];

      if (!vA || !vB) {
        return { versionA: vA, versionB: vB, differences };
      }

      // Compare content
      if (vA.content !== vB.content) {
        differences.push('Content differs');
      }

      // Compare variables
      if (JSON.stringify(vA.variables) !== JSON.stringify(vB.variables)) {
        differences.push('Variables differ');
      }

      // Compare metadata
      if (vA.author !== vB.author) {
        differences.push(`Author differs: ${vA.author} vs ${vB.author}`);
      }

      return { versionA: vA, versionB: vB, differences };
    } catch (error) {
      this.logger.error(
        `Failed to compare versions ${versionA} and ${versionB}:`,
        error
      );
      return {
        versionA: null,
        versionB: null,
        differences: ['Comparison failed'],
      };
    }
  }

  /**
   * Encrypt sensitive content
   * Property 21: Sensitive information encryption
   * Validates: Requirements 4.7
   */
  private encryptContent(content: string): string {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(
        'aes-256-cbc',
        Buffer.from(this.encryptionKey.padEnd(32, '0').slice(0, 32)),
        iv
      );

      let encrypted = cipher.update(content, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Prepend IV to encrypted content
      return `enc:${iv.toString('hex')}:${encrypted}`;
    } catch (error) {
      this.logger.error('Failed to encrypt content:', error);
      throw error;
    }
  }

  /**
   * Decrypt sensitive content
   */
  private decryptContent(encryptedContent: string): string {
    try {
      if (!encryptedContent.startsWith('enc:')) {
        return encryptedContent;
      }

      const parts = encryptedContent.slice(4).split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];

      const decipher = crypto.createDecipheriv(
        'aes-256-cbc',
        Buffer.from(this.encryptionKey.padEnd(32, '0').slice(0, 32)),
        iv
      );

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error('Failed to decrypt content:', error);
      throw error;
    }
  }

  /**
   * Check if content is encrypted
   */
  private isEncrypted(content: string): boolean {
    return content.startsWith('enc:');
  }

  /**
   * Extract variables from template content
   */
  private extractVariables(content: string): string[] {
    const matches = content.match(/{([^}]+)}/g);
    if (!matches) {
      return [];
    }

    const uniqueVars = new Set(matches.map((m) => m.slice(1, -1)));
    return Array.from(uniqueVars);
  }
}
