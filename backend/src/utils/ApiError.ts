/**
 * Custom API Error class for structured error handling
 * Allows errors to have both human-readable messages and machine-readable error codes
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'ApiError';
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}
