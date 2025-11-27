import { Test, TestingModule } from '@nestjs/testing';
import { HttpExceptionFilter } from './http-exception.filter';
import { ArgumentsHost, BadRequestException, HttpStatus } from '@nestjs/common';
import { AppException } from '../exceptions/app.exception';
import { ErrorCode } from '../exceptions/error-codes';
import { AuthenticationException } from '../exceptions/authentication.exception';
import { ValidationException } from '../exceptions/validation.exception';
import { ResourceNotFoundException } from '../exceptions/resource-not-found.exception';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockResponse: any;
  let mockRequest: any;
  let mockArgumentsHost: any;

  beforeEach(() => {
    filter = new HttpExceptionFilter();

    // Mock response
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Mock request
    mockRequest = {
      method: 'GET',
      url: '/api/test',
      headers: {},
    };

    // Mock ArgumentsHost
    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    };
  });

  describe('AppException handling', () => {
    it('should handle AppException with correct error code and message', () => {
      const exception = new AppException(
        ErrorCode.INVALID_INPUT,
        'Invalid email format',
        HttpStatus.BAD_REQUEST,
        { field: 'email' }
      );

      filter.catch(exception, mockArgumentsHost as ArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: ErrorCode.INVALID_INPUT,
            message: 'Invalid email format',
            timestamp: expect.any(String),
            requestId: expect.any(String),
          }),
        })
      );
    });

    it('should include details in development mode', () => {
      process.env.NODE_ENV = 'development';
      const exception = new AppException(
        ErrorCode.INVALID_INPUT,
        'Invalid input',
        HttpStatus.BAD_REQUEST,
        { field: 'email' }
      );

      filter.catch(exception, mockArgumentsHost as ArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: { field: 'email' },
          }),
        })
      );
    });

    it('should not include details in production mode', () => {
      process.env.NODE_ENV = 'production';
      const exception = new AppException(
        ErrorCode.INVALID_INPUT,
        'Invalid input',
        HttpStatus.BAD_REQUEST,
        { field: 'email' }
      );

      filter.catch(exception, mockArgumentsHost as ArgumentsHost);

      const callArgs = mockResponse.json.mock.calls[0][0];
      expect(callArgs.error.details).toBeUndefined();
    });
  });

  describe('AuthenticationException handling', () => {
    it('should handle AuthenticationException with 401 status', () => {
      const exception = new AuthenticationException(
        ErrorCode.TOKEN_EXPIRED,
        'Your session has expired. Please log in again.'
      );

      filter.catch(exception, mockArgumentsHost as ArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: ErrorCode.TOKEN_EXPIRED,
            message: 'Your session has expired. Please log in again.',
          }),
        })
      );
    });
  });

  describe('ValidationException handling', () => {
    it('should handle ValidationException with 400 status', () => {
      const exception = new ValidationException(
        ErrorCode.INVALID_FILE_FORMAT,
        'Invalid file format. Please upload a PDF, DOCX, or TXT file.'
      );

      filter.catch(exception, mockArgumentsHost as ArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: ErrorCode.INVALID_FILE_FORMAT,
          }),
        })
      );
    });

    it('should handle FILE_TOO_LARGE with 413 status', () => {
      const exception = new ValidationException(
        ErrorCode.FILE_TOO_LARGE,
        'File size exceeds the maximum limit of 10MB.'
      );

      filter.catch(exception, mockArgumentsHost as ArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.PAYLOAD_TOO_LARGE
      );
    });
  });

  describe('ResourceNotFoundException handling', () => {
    it('should handle ResourceNotFoundException with 404 status', () => {
      const exception = new ResourceNotFoundException(
        ErrorCode.RESUME_NOT_FOUND,
        'Resume not found.'
      );

      filter.catch(exception, mockArgumentsHost as ArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: ErrorCode.RESUME_NOT_FOUND,
            message: 'Resume not found.',
          }),
        })
      );
    });
  });

  describe('BadRequestException handling', () => {
    it('should handle BadRequestException from class-validator', () => {
      const exception = new BadRequestException({
        message: [
          'email must be an email',
          'password must be longer than 8 characters',
        ],
        error: 'Bad Request',
      });

      filter.catch(exception, mockArgumentsHost as ArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: ErrorCode.INVALID_INPUT,
            message: 'email must be an email',
          }),
        })
      );
    });
  });

  describe('Request ID generation', () => {
    it('should use x-request-id header if provided', () => {
      mockRequest.headers['x-request-id'] = 'custom-request-id';
      const exception = new AppException(
        ErrorCode.BAD_REQUEST,
        'Bad request',
        HttpStatus.BAD_REQUEST
      );

      filter.catch(exception, mockArgumentsHost as ArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            requestId: 'custom-request-id',
          }),
        })
      );
    });

    it('should generate request ID if not provided', () => {
      const exception = new AppException(
        ErrorCode.BAD_REQUEST,
        'Bad request',
        HttpStatus.BAD_REQUEST
      );

      filter.catch(exception, mockArgumentsHost as ArgumentsHost);

      const callArgs = mockResponse.json.mock.calls[0][0];
      expect(callArgs.error.requestId).toBeDefined();
      expect(callArgs.error.requestId).toMatch(/^\d+-[a-z0-9]+$/);
    });
  });

  describe('Error response format', () => {
    it('should always include required fields in error response', () => {
      const exception = new AppException(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR
      );

      filter.catch(exception, mockArgumentsHost as ArgumentsHost);

      const callArgs = mockResponse.json.mock.calls[0][0];
      expect(callArgs.error).toHaveProperty('code');
      expect(callArgs.error).toHaveProperty('message');
      expect(callArgs.error).toHaveProperty('timestamp');
      expect(callArgs.error).toHaveProperty('requestId');
    });

    it('should have correct timestamp format', () => {
      const exception = new AppException(
        ErrorCode.BAD_REQUEST,
        'Bad request',
        HttpStatus.BAD_REQUEST
      );

      filter.catch(exception, mockArgumentsHost as ArgumentsHost);

      const callArgs = mockResponse.json.mock.calls[0][0];
      const timestamp = new Date(callArgs.error.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });
});
