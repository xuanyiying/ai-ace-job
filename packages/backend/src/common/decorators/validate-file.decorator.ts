import {
  createParamDecorator,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { FileUploadValidator } from '../validators/file-upload.validator';

/**
 * Decorator to validate uploaded files
 * Usage: @ValidateFile() file: Express.Multer.File
 */
export const ValidateFile = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const file = request.file;

    if (!file) {
      throw new BadRequestException('No file provided');
    }

    try {
      FileUploadValidator.validateFile(file);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'File validation failed'
      );
    }

    return file;
  }
);
