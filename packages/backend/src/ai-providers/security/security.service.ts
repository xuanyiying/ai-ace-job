import { Injectable, Inject, ForbiddenException } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

/**
 * Security Service
 * Manages API key encryption, key rotation, access control, and audit logging
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6
 * Properties: 64, 65, 66, 67, 68, 69
 */

export interface UserModelAccess {
  userId: string;
  modelId: string;
  provider: string;
  grantedAt: Date;
  grantedBy: string;
}

export interface APIKeyRotation {
  modelId: string;
  oldKeyHash: string;
  newKeyHash: string;
  rotatedAt: Date;
  rotatedBy: string;
  reason: string;
}

export interface SecurityAuditEvent {
  id?: string;
  action: string;
  resource: string;
  userId?: string;
  details?: Record<string, any>;
  timestamp?: Date;
}

@Injectable()
export class SecurityService {
  private readonly ENCRYPTION_ALGORITHM = 'aes-256-cbc';
  private readonly ENCRYPTION_KEY = this.getEncryptionKey();
  private readonly userModelAccessMap = new Map<string, Set<string>>();

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly prisma: PrismaService
  ) {
    this.initializeAccessControl();
  }

  /**
   * Get encryption key from environment
   * Requirement 12.1: Use encryption to store API keys
   */
  private getEncryptionKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable is not set');
    }
    // Ensure key is 32 bytes for AES-256
    return crypto.createHash('sha256').update(key).digest();
  }

  /**
   * Encrypt API key
   * Requirement 12.1: Use encryption to store API keys
   * Property 64: API keys should be encrypted
   */
  encryptAPIKey(apiKey: string): string {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(
        this.ENCRYPTION_ALGORITHM,
        this.ENCRYPTION_KEY,
        iv
      );

      let encrypted = cipher.update(apiKey, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Combine IV and encrypted data
      return `${iv.toString('hex')}:${encrypted}`;
    } catch (error) {
      this.logger.error('Failed to encrypt API key', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error('Failed to encrypt API key');
    }
  }

  /**
   * Decrypt API key
   * Requirement 12.1: Use encryption to store API keys
   * Property 64: API keys should be decrypted for use
   */
  decryptAPIKey(encryptedKey: string): string {
    try {
      const [ivHex, encrypted] = encryptedKey.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv(
        this.ENCRYPTION_ALGORITHM,
        this.ENCRYPTION_KEY,
        iv
      );

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error('Failed to decrypt API key', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error('Failed to decrypt API key');
    }
  }

  /**
   * Hash API key for comparison
   * Requirement 12.1: Store API keys securely
   */
  hashAPIKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  /**
   * Rotate API key
   * Requirement 12.3: Support periodic API key rotation
   * Property 66: API keys should support rotation
   */
  async rotateAPIKey(
    modelId: string,
    newApiKey: string,
    rotatedBy: string,
    reason: string
  ): Promise<void> {
    try {
      const modelConfig = await this.prisma.modelConfig.findUnique({
        where: { id: modelId },
      });

      if (!modelConfig) {
        throw new Error(`Model config not found: ${modelId}`);
      }

      const oldKeyHash = this.hashAPIKey(modelConfig.apiKey);
      const newKeyHash = this.hashAPIKey(newApiKey);
      const encryptedNewKey = this.encryptAPIKey(newApiKey);

      // Update model config with new key
      await this.prisma.modelConfig.update({
        where: { id: modelId },
        data: {
          apiKey: encryptedNewKey,
          updatedAt: new Date(),
        },
      });

      // Log the rotation in audit log
      await this.logAuditEvent({
        action: 'API_KEY_ROTATED',
        resource: `ModelConfig:${modelId}`,
        userId: rotatedBy,
        details: {
          oldKeyHash,
          newKeyHash,
          reason,
          provider: modelConfig.provider,
        },
      });

      this.logger.info('API key rotated successfully', {
        modelId,
        provider: modelConfig.provider,
        rotatedBy,
        reason,
      });
    } catch (error) {
      this.logger.error('Failed to rotate API key', {
        modelId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Grant user access to a model
   * Requirement 12.4: Support setting different AI model access permissions for different users
   * Property 67: User access control should be enforced
   */
  async grantUserAccess(
    userId: string,
    modelId: string,
    grantedBy: string
  ): Promise<void> {
    try {
      const modelConfig = await this.prisma.modelConfig.findUnique({
        where: { id: modelId },
      });

      if (!modelConfig) {
        throw new Error(`Model config not found: ${modelId}`);
      }

      // Store in memory cache
      //const key = `${userId}:${modelId}`;
      if (!this.userModelAccessMap.has(userId)) {
        this.userModelAccessMap.set(userId, new Set());
      }
      this.userModelAccessMap.get(userId)!.add(modelId);

      // Log the access grant
      await this.logAuditEvent({
        action: 'USER_ACCESS_GRANTED',
        resource: `User:${userId}`,
        userId: grantedBy,
        details: {
          modelId,
          provider: modelConfig.provider,
          grantedAt: new Date(),
        },
      });

      this.logger.info('User access granted', {
        userId,
        modelId,
        provider: modelConfig.provider,
        grantedBy,
      });
    } catch (error) {
      this.logger.error('Failed to grant user access', {
        userId,
        modelId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Revoke user access to a model
   * Requirement 12.4: Support setting different AI model access permissions for different users
   * Property 67: User access control should be enforced
   */
  async revokeUserAccess(
    userId: string,
    modelId: string,
    revokedBy: string
  ): Promise<void> {
    try {
      const modelConfig = await this.prisma.modelConfig.findUnique({
        where: { id: modelId },
      });

      if (!modelConfig) {
        throw new Error(`Model config not found: ${modelId}`);
      }

      // Remove from memory cache
      if (this.userModelAccessMap.has(userId)) {
        this.userModelAccessMap.get(userId)!.delete(modelId);
      }

      // Log the access revocation
      await this.logAuditEvent({
        action: 'USER_ACCESS_REVOKED',
        resource: `User:${userId}`,
        userId: revokedBy,
        details: {
          modelId,
          provider: modelConfig.provider,
          revokedAt: new Date(),
        },
      });

      this.logger.info('User access revoked', {
        userId,
        modelId,
        provider: modelConfig.provider,
        revokedBy,
      });
    } catch (error) {
      this.logger.error('Failed to revoke user access', {
        userId,
        modelId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Check if user has access to a model
   * Requirement 12.4: Support setting different AI model access permissions for different users
   * Requirement 12.5: Deny unauthorized model access requests and log security events
   * Property 67: User access control should be enforced
   * Property 68: Unauthorized access should be denied
   */
  async checkUserAccess(userId: string, modelId: string): Promise<boolean> {
    try {
      // Check in-memory cache first
      if (
        this.userModelAccessMap.has(userId) &&
        this.userModelAccessMap.get(userId)!.has(modelId)
      ) {
        return true;
      }

      // If not in cache, deny access
      // In a real system, you might want to load from database
      return false;
    } catch (error) {
      this.logger.error('Failed to check user access', {
        userId,
        modelId,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Enforce access control
   * Requirement 12.5: Deny unauthorized model access requests and log security events
   * Property 68: Unauthorized access should be denied and logged
   */
  async enforceAccess(userId: string, modelId: string): Promise<void> {
    const hasAccess = await this.checkUserAccess(userId, modelId);

    if (!hasAccess) {
      // Log security event
      await this.logAuditEvent({
        action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        resource: `ModelConfig:${modelId}`,
        userId,
        details: {
          modelId,
          timestamp: new Date(),
        },
      });

      this.logger.warn('Unauthorized access attempt', {
        userId,
        modelId,
      });

      throw new ForbiddenException(
        `User ${userId} does not have access to model ${modelId}`
      );
    }
  }

  /**
   * Log audit event
   * Requirement 12.6: Support audit logs for all API key access and modification operations
   * Property 69: Audit logs should record all API key operations
   */
  async logAuditEvent(event: SecurityAuditEvent): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: event.action,
          resource: event.resource,
          userId: event.userId,
          details: event.details,
          timestamp: event.timestamp || new Date(),
        },
      });

      this.logger.info('Audit event logged', {
        action: event.action,
        resource: event.resource,
        userId: event.userId,
      });
    } catch (error) {
      this.logger.error('Failed to log audit event', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Query audit logs
   * Requirement 12.6: Support audit logs for all API key access and modification operations
   * Property 69: Audit logs should be queryable
   */
  async queryAuditLogs(
    action?: string,
    resource?: string,
    userId?: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100,
    offset: number = 0
  ): Promise<SecurityAuditEvent[]> {
    try {
      const where: any = {};

      if (action) where.action = action;
      if (resource) where.resource = resource;
      if (userId) where.userId = userId;

      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) where.timestamp.gte = startDate;
        if (endDate) where.timestamp.lte = endDate;
      }

      const logs = await this.prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
      });

      return logs as SecurityAuditEvent[];
    } catch (error) {
      this.logger.error('Failed to query audit logs', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Sanitize sensitive data from logs
   * Requirement 12.2: Do not record API keys or sensitive information in logs
   * Property 65: Sensitive information should not be logged
   */
  sanitizeSensitiveData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sanitized = { ...data };

    // List of sensitive field names to redact
    const sensitiveFields = [
      'apiKey',
      'api_key',
      'password',
      'token',
      'secret',
      'authorization',
      'bearer',
    ];

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    // Recursively sanitize nested objects
    for (const key in sanitized) {
      if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeSensitiveData(sanitized[key]);
      }
    }

    return sanitized;
  }

  /**
   * Initialize access control from database
   * Load user access permissions on service initialization
   */
  private async initializeAccessControl(): Promise<void> {
    try {
      // In a real system, you would load user access permissions from database
      // For now, this is a placeholder
      this.logger.info('Access control initialized');
    } catch (error) {
      this.logger.error('Failed to initialize access control', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get audit log statistics
   * Requirement 12.6: Support audit logs for all API key access and modification operations
   */
  async getAuditLogStatistics(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalEvents: number;
    eventsByAction: Record<string, number>;
    eventsByResource: Record<string, number>;
  }> {
    try {
      const where: any = {};

      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) where.timestamp.gte = startDate;
        if (endDate) where.timestamp.lte = endDate;
      }

      const logs = await this.prisma.auditLog.findMany({
        where,
      });

      const eventsByAction: Record<string, number> = {};
      const eventsByResource: Record<string, number> = {};

      for (const log of logs) {
        eventsByAction[log.action] = (eventsByAction[log.action] || 0) + 1;
        eventsByResource[log.resource] =
          (eventsByResource[log.resource] || 0) + 1;
      }

      return {
        totalEvents: logs.length,
        eventsByAction,
        eventsByResource,
      };
    } catch (error) {
      this.logger.error('Failed to get audit log statistics', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        totalEvents: 0,
        eventsByAction: {},
        eventsByResource: {},
      };
    }
  }
}
