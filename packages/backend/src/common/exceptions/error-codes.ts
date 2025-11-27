/**
 * Standardized error codes for the application
 * Format: CATEGORY_SPECIFIC_ERROR
 */
export enum ErrorCode {
  // Authentication errors (401)
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  SESSION_EXPIRED = 'SESSION_EXPIRED',

  // Authorization errors (403)
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Validation errors (400)
  BAD_REQUEST = 'BAD_REQUEST',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FILE_FORMAT = 'INVALID_FILE_FORMAT',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_EMAIL = 'INVALID_EMAIL',
  WEAK_PASSWORD = 'WEAK_PASSWORD',

  // Resource errors (404)
  NOT_FOUND = 'NOT_FOUND',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  RESUME_NOT_FOUND = 'RESUME_NOT_FOUND',
  JOB_NOT_FOUND = 'JOB_NOT_FOUND',
  OPTIMIZATION_NOT_FOUND = 'OPTIMIZATION_NOT_FOUND',
  TEMPLATE_NOT_FOUND = 'TEMPLATE_NOT_FOUND',

  // Conflict errors (409)
  CONFLICT = 'CONFLICT',
  DUPLICATE_RESOURCE = 'DUPLICATE_RESOURCE',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',

  // Business logic errors (422)
  UNPROCESSABLE_ENTITY = 'UNPROCESSABLE_ENTITY',
  INVALID_STATE = 'INVALID_STATE',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',
  INVALID_TRANSITION = 'INVALID_TRANSITION',

  // Server errors (500)
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  CACHE_ERROR = 'CACHE_ERROR',
  FILE_STORAGE_ERROR = 'FILE_STORAGE_ERROR',

  // External service errors (502/503)
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  AI_SERVICE_UNAVAILABLE = 'AI_SERVICE_UNAVAILABLE',
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  THIRD_PARTY_SERVICE_ERROR = 'THIRD_PARTY_SERVICE_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',

  // Parsing/Processing errors
  PARSE_ERROR = 'PARSE_ERROR',
  RESUME_PARSE_ERROR = 'RESUME_PARSE_ERROR',
  JOB_PARSE_ERROR = 'JOB_PARSE_ERROR',
  PDF_GENERATION_ERROR = 'PDF_GENERATION_ERROR',

  // Timeout errors
  REQUEST_TIMEOUT = 'REQUEST_TIMEOUT',
  OPERATION_TIMEOUT = 'OPERATION_TIMEOUT',
}

/**
 * Error code to HTTP status mapping
 */
export const ERROR_CODE_TO_STATUS: Record<ErrorCode, number> = {
  // 401 Unauthorized
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.INVALID_CREDENTIALS]: 401,
  [ErrorCode.TOKEN_EXPIRED]: 401,
  [ErrorCode.TOKEN_INVALID]: 401,
  [ErrorCode.SESSION_EXPIRED]: 401,

  // 403 Forbidden
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: 403,
  [ErrorCode.QUOTA_EXCEEDED]: 403,
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,

  // 400 Bad Request
  [ErrorCode.BAD_REQUEST]: 400,
  [ErrorCode.INVALID_INPUT]: 400,
  [ErrorCode.MISSING_REQUIRED_FIELD]: 400,
  [ErrorCode.INVALID_FILE_FORMAT]: 400,
  [ErrorCode.FILE_TOO_LARGE]: 413,
  [ErrorCode.INVALID_EMAIL]: 400,
  [ErrorCode.WEAK_PASSWORD]: 400,

  // 404 Not Found
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.RESOURCE_NOT_FOUND]: 404,
  [ErrorCode.USER_NOT_FOUND]: 404,
  [ErrorCode.RESUME_NOT_FOUND]: 404,
  [ErrorCode.JOB_NOT_FOUND]: 404,
  [ErrorCode.OPTIMIZATION_NOT_FOUND]: 404,
  [ErrorCode.TEMPLATE_NOT_FOUND]: 404,

  // 409 Conflict
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.DUPLICATE_RESOURCE]: 409,
  [ErrorCode.EMAIL_ALREADY_EXISTS]: 409,
  [ErrorCode.RESOURCE_ALREADY_EXISTS]: 409,

  // 422 Unprocessable Entity
  [ErrorCode.UNPROCESSABLE_ENTITY]: 422,
  [ErrorCode.INVALID_STATE]: 422,
  [ErrorCode.OPERATION_NOT_ALLOWED]: 422,
  [ErrorCode.INVALID_TRANSITION]: 422,

  // 500 Internal Server Error
  [ErrorCode.INTERNAL_SERVER_ERROR]: 500,
  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.CACHE_ERROR]: 500,
  [ErrorCode.FILE_STORAGE_ERROR]: 500,

  // 502/503 Service Errors
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
  [ErrorCode.AI_SERVICE_UNAVAILABLE]: 503,
  [ErrorCode.AI_SERVICE_ERROR]: 502,
  [ErrorCode.THIRD_PARTY_SERVICE_ERROR]: 502,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,

  // Parsing/Processing errors
  [ErrorCode.PARSE_ERROR]: 422,
  [ErrorCode.RESUME_PARSE_ERROR]: 422,
  [ErrorCode.JOB_PARSE_ERROR]: 422,
  [ErrorCode.PDF_GENERATION_ERROR]: 500,

  // Timeout errors
  [ErrorCode.REQUEST_TIMEOUT]: 408,
  [ErrorCode.OPERATION_TIMEOUT]: 408,
};

/**
 * Error code to user-friendly message mapping
 */
export const ERROR_CODE_TO_MESSAGE: Record<ErrorCode, string> = {
  // Authentication errors
  [ErrorCode.UNAUTHORIZED]: 'Authentication required. Please log in.',
  [ErrorCode.INVALID_CREDENTIALS]:
    'Invalid email or password. Please try again.',
  [ErrorCode.TOKEN_EXPIRED]: 'Your session has expired. Please log in again.',
  [ErrorCode.TOKEN_INVALID]:
    'Invalid authentication token. Please log in again.',
  [ErrorCode.SESSION_EXPIRED]: 'Your session has expired. Please log in again.',

  // Authorization errors
  [ErrorCode.FORBIDDEN]: 'You do not have permission to access this resource.',
  [ErrorCode.INSUFFICIENT_PERMISSIONS]:
    'You do not have the required permissions for this action.',
  [ErrorCode.QUOTA_EXCEEDED]:
    'You have exceeded your usage quota. Please upgrade your plan.',
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please try again later.',

  // Validation errors
  [ErrorCode.BAD_REQUEST]: 'Invalid request. Please check your input.',
  [ErrorCode.INVALID_INPUT]:
    'Invalid input provided. Please check the required fields.',
  [ErrorCode.MISSING_REQUIRED_FIELD]:
    'Required field is missing. Please provide all required information.',
  [ErrorCode.INVALID_FILE_FORMAT]:
    'Invalid file format. Please upload a PDF, DOCX, or TXT file.',
  [ErrorCode.FILE_TOO_LARGE]: 'File size exceeds the maximum limit of 10MB.',
  [ErrorCode.INVALID_EMAIL]:
    'Invalid email address. Please provide a valid email.',
  [ErrorCode.WEAK_PASSWORD]:
    'Password is too weak. Please use a stronger password.',

  // Resource errors
  [ErrorCode.NOT_FOUND]: 'The requested resource was not found.',
  [ErrorCode.RESOURCE_NOT_FOUND]: 'The requested resource was not found.',
  [ErrorCode.USER_NOT_FOUND]: 'User not found.',
  [ErrorCode.RESUME_NOT_FOUND]: 'Resume not found.',
  [ErrorCode.JOB_NOT_FOUND]: 'Job not found.',
  [ErrorCode.OPTIMIZATION_NOT_FOUND]: 'Optimization record not found.',
  [ErrorCode.TEMPLATE_NOT_FOUND]: 'Template not found.',

  // Conflict errors
  [ErrorCode.CONFLICT]: 'The request conflicts with existing data.',
  [ErrorCode.DUPLICATE_RESOURCE]: 'This resource already exists.',
  [ErrorCode.EMAIL_ALREADY_EXISTS]: 'This email address is already registered.',
  [ErrorCode.RESOURCE_ALREADY_EXISTS]: 'This resource already exists.',

  // Business logic errors
  [ErrorCode.UNPROCESSABLE_ENTITY]: 'The request could not be processed.',
  [ErrorCode.INVALID_STATE]:
    'The resource is in an invalid state for this operation.',
  [ErrorCode.OPERATION_NOT_ALLOWED]: 'This operation is not allowed.',
  [ErrorCode.INVALID_TRANSITION]: 'Invalid state transition.',

  // Server errors
  [ErrorCode.INTERNAL_SERVER_ERROR]:
    'An internal server error occurred. Please try again later.',
  [ErrorCode.DATABASE_ERROR]:
    'A database error occurred. Please try again later.',
  [ErrorCode.CACHE_ERROR]: 'A cache error occurred. Please try again later.',
  [ErrorCode.FILE_STORAGE_ERROR]:
    'A file storage error occurred. Please try again later.',

  // External service errors
  [ErrorCode.EXTERNAL_SERVICE_ERROR]:
    'An external service error occurred. Please try again later.',
  [ErrorCode.AI_SERVICE_UNAVAILABLE]:
    'AI service is temporarily unavailable. Please try again later.',
  [ErrorCode.AI_SERVICE_ERROR]:
    'AI service encountered an error. Please try again later.',
  [ErrorCode.THIRD_PARTY_SERVICE_ERROR]:
    'A third-party service error occurred. Please try again later.',
  [ErrorCode.SERVICE_UNAVAILABLE]:
    'The service is temporarily unavailable. Please try again later.',

  // Parsing/Processing errors
  [ErrorCode.PARSE_ERROR]:
    'Failed to parse the provided data. Please check the format.',
  [ErrorCode.RESUME_PARSE_ERROR]:
    'Failed to parse the resume. Please ensure the file is valid.',
  [ErrorCode.JOB_PARSE_ERROR]:
    'Failed to parse the job description. Please check the format.',
  [ErrorCode.PDF_GENERATION_ERROR]:
    'Failed to generate PDF. Please try again later.',

  // Timeout errors
  [ErrorCode.REQUEST_TIMEOUT]: 'Request timeout. Please try again.',
  [ErrorCode.OPERATION_TIMEOUT]: 'Operation timeout. Please try again.',
};
