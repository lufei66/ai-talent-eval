// ============================================================
// Global error handler
// ============================================================

import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Headers already sent — delegate to Express default handler
  if (res.headersSent) {
    _next(err);
    return;
  }

  if (err instanceof AppError) {
    res.status(err.httpStatus).json({
      code: err.code,
      message: err.message,
      data: null,
      timestamp: Date.now(),
    });
    return;
  }

  console.error('[Error]', err.stack || err.message);

  res.status(500).json({
    code: 9999,
    message: err.message || '服务器内部错误',
    data: null,
    timestamp: Date.now(),
  });
}
