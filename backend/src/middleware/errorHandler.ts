import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';

export class ApiError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof ApiError) {
    logger.error(`[${req.method} ${req.path}] ${err.message}`);
    return res.status(err.statusCode).json({
      error: err.message,
      statusCode: err.statusCode,
    });
  }

  logger.error(`Unhandled error: ${err.message}`, err);
  res.status(500).json({
    error: 'Internal server error',
    statusCode: 500,
  });
};
