import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { ApiError } from '../utils/ApiError';

export function errorHandler(
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (err instanceof ApiError) {
    logger.error(`API Error: ${err.message}`, { code: err.code, statusCode: err.statusCode });
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      statusCode: err.statusCode,
    });
  } else {
    logger.error(`Unexpected error: ${err.message}`, err);
    res.status(500).json({
      error: 'Internal Server Error',
      statusCode: 500,
    });
  }
}
