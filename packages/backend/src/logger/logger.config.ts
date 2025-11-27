import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';

/**
 * Logger Configuration
 * Requirement 12.5: Structured logging with Winston
 * Supports multiple transports: console, file (errors), file (combined)
 * Log levels: error, warn, info, debug
 */

// Determine log level from environment variable
const getLogLevel = (): string => {
  const level = process.env.LOG_LEVEL || 'info';
  const validLevels = ['error', 'warn', 'info', 'debug'];
  return validLevels.includes(level) ? level : 'info';
};

export const loggerConfig: WinstonModuleOptions = {
  level: getLogLevel(),
  transports: [
    // Console transport for development/debugging
    new winston.transports.Console({
      level: getLogLevel(),
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.colorize(),
        winston.format.printf(
          ({ timestamp, level, message, context, trace, ...meta }) => {
            const metaStr =
              Object.keys(meta).length > 0
                ? `\n${JSON.stringify(meta, null, 2)}`
                : '';
            return `${timestamp} [${context || 'Application'}] ${level}: ${message}${trace ? `\n${trace}` : ''}${metaStr}`;
          }
        )
      ),
    }),
    // File transport for errors only
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.json()
      ),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      level: getLogLevel(),
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.json()
      ),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: 'logs/exceptions.log',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.json()
      ),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: 'logs/rejections.log',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.json()
      ),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
};
