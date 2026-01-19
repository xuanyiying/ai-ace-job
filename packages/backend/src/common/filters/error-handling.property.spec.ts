import * as fc from 'fast-check';
import { HttpExceptionFilter } from './http-exception.filter';
import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { AppException } from '../exceptions/app.exception';
import {
  ErrorCode,
  ERROR_CODE_TO_STATUS,
  ERROR_CODE_TO_MESSAGE,
} from '../exceptions/error-codes';

/**
 * Property-based tests for error handling system
 * **Feature: interview-ai-mvp, Property 31: 错误响应标准化**
 * **Validates: Requirements 12.1**
 */
describe('Error Handling - Property Tests', () => {
  let filter: HttpExceptionFilter;
  let mockResponse: any;
  let mockRequest: any;
  let mockArgumentsHost: any;
  let mockMonitoring: any;
  let mockAlerting: any;
  let mockLogger: any;

  beforeEach(() => {
    mockMonitoring = {
      captureException: jest.fn(),
    };

    mockAlerting = {
      createAlert: jest.fn().mockResolvedValue({ id: 'alert-id' }),
    };

    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
    };

    filter = new HttpExceptionFilter(
      mockMonitoring as any,
      mockAlerting as any,
      mockLogger as any
    );

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockRequest = {
      method: 'GET',
      url: '/api/test',
      headers: {},
    };

    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    };
  });

  /**
   * Property: Error response always contains required fields
   * For any error, the response should always include code, message, timestamp, and requestId
   */
  it('should always include required error response fields', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.values(ErrorCode)),
        fc.string({ minLength: 1, maxLength: 200 }),
        (errorCode, message) => {
          const exception = new AppException(
            errorCode as ErrorCode,
            message,
            HttpStatus.BAD_REQUEST
          );

          filter.catch(exception, mockArgumentsHost as ArgumentsHost);

          const callArgs = mockResponse.json.mock.calls[0][0];
          expect(callArgs).toHaveProperty('error');
          expect(callArgs.error).toHaveProperty('code');
          expect(callArgs.error).toHaveProperty('message');
          expect(callArgs.error).toHaveProperty('timestamp');
          expect(callArgs.error).toHaveProperty('requestId');

          // Reset mock for next iteration
          mockResponse.json.mockClear();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Error code matches HTTP status
   * For any error code, the HTTP status should match the mapping in ERROR_CODE_TO_STATUS
   */
  it('should return correct HTTP status for error code', () => {
    fc.assert(
      fc.property(fc.constantFrom(...Object.values(ErrorCode)), (errorCode) => {
        const expectedStatus = ERROR_CODE_TO_STATUS[errorCode as ErrorCode];
        const exception = new AppException(
          errorCode as ErrorCode,
          'Test error',
          expectedStatus
        );

        filter.catch(exception, mockArgumentsHost as ArgumentsHost);

        expect(mockResponse.status).toHaveBeenCalledWith(expectedStatus);

        // Reset mock for next iteration
        mockResponse.status.mockClear();
        mockResponse.json.mockClear();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Error message is user-friendly
   * For any error code, the message should be a non-empty string
   */
  it('should provide user-friendly error messages', () => {
    fc.assert(
      fc.property(fc.constantFrom(...Object.values(ErrorCode)), (errorCode) => {
        const message = ERROR_CODE_TO_MESSAGE[errorCode as ErrorCode];
        expect(message).toBeDefined();
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Timestamp is valid ISO 8601 format
   * For any error, the timestamp should be a valid ISO 8601 date string
   */
  it('should include valid ISO 8601 timestamp', () => {
    fc.assert(
      fc.property(fc.constantFrom(...Object.values(ErrorCode)), (errorCode) => {
        const exception = new AppException(
          errorCode as ErrorCode,
          'Test error',
          HttpStatus.BAD_REQUEST
        );

        filter.catch(exception, mockArgumentsHost as ArgumentsHost);

        const callArgs = mockResponse.json.mock.calls[0][0];
        const timestamp = callArgs.error.timestamp;

        // Verify it's a valid ISO 8601 string
        expect(timestamp).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
        );

        // Verify it can be parsed as a date
        const date = new Date(timestamp);
        expect(date).toBeInstanceOf(Date);
        expect(date.getTime()).toBeLessThanOrEqual(Date.now());

        // Reset mock for next iteration
        mockResponse.json.mockClear();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Request ID is always present and unique
   * For any error, the requestId should be present and follow the format
   */
  it('should generate unique request IDs', () => {
    const requestIds = new Set<string>();

    fc.assert(
      fc.property(fc.constantFrom(...Object.values(ErrorCode)), (errorCode) => {
        const exception = new AppException(
          errorCode as ErrorCode,
          'Test error',
          HttpStatus.BAD_REQUEST
        );

        filter.catch(exception, mockArgumentsHost as ArgumentsHost);

        const callArgs = mockResponse.json.mock.calls[0][0];
        const requestId = callArgs.error.requestId;

        expect(requestId).toBeDefined();
        expect(typeof requestId).toBe('string');
        expect(requestId.length).toBeGreaterThan(0);

        // Check format: timestamp-random
        expect(requestId).toMatch(/^\d+-[a-z0-9]+$/);

        // Track for uniqueness check
        requestIds.add(requestId);

        // Reset mock for next iteration
        mockResponse.json.mockClear();
      }),
      { numRuns: 100 }
    );

    // Verify we got many unique request IDs
    expect(requestIds.size).toBeGreaterThan(90);
  });

  /**
   * Property: Error code is always a string
   * For any error, the code should be a non-empty string
   */
  it('should always have string error code', () => {
    fc.assert(
      fc.property(fc.constantFrom(...Object.values(ErrorCode)), (errorCode) => {
        const exception = new AppException(
          errorCode as ErrorCode,
          'Test error',
          HttpStatus.BAD_REQUEST
        );

        filter.catch(exception, mockArgumentsHost as ArgumentsHost);

        const callArgs = mockResponse.json.mock.calls[0][0];
        const code = callArgs.error.code;

        expect(typeof code).toBe('string');
        expect(code.length).toBeGreaterThan(0);
        expect(code).toMatch(/^[A-Z_]+$/);

        // Reset mock for next iteration
        mockResponse.json.mockClear();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Error response structure is consistent
   * For any error, the response should have the same structure
   */
  it('should maintain consistent error response structure', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.values(ErrorCode)),
        fc.string({ minLength: 1, maxLength: 200 }),
        (errorCode, message) => {
          const exception = new AppException(
            errorCode as ErrorCode,
            message,
            HttpStatus.BAD_REQUEST
          );

          filter.catch(exception, mockArgumentsHost as ArgumentsHost);

          const callArgs = mockResponse.json.mock.calls[0][0];

          // Verify structure
          expect(Object.keys(callArgs)).toEqual(['error']);
          expect(Object.keys(callArgs.error)).toContain('code');
          expect(Object.keys(callArgs.error)).toContain('message');
          expect(Object.keys(callArgs.error)).toContain('timestamp');
          expect(Object.keys(callArgs.error)).toContain('requestId');

          // Reset mock for next iteration
          mockResponse.json.mockClear();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: HTTP status is always valid
   * For any error, the HTTP status should be a valid HTTP status code
   */
  it('should use valid HTTP status codes', () => {
    const validStatuses = [
      400, 401, 403, 404, 408, 409, 413, 422, 429, 500, 502, 503,
    ];

    fc.assert(
      fc.property(fc.constantFrom(...Object.values(ErrorCode)), (errorCode) => {
        const status = ERROR_CODE_TO_STATUS[errorCode as ErrorCode];
        expect(validStatuses).toContain(status);
      }),
      { numRuns: 100 }
    );
  });
});
