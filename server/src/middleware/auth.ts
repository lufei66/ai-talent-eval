// ============================================================
// Auth middleware — Bearer token 认证
// 验证请求头 Authorization: Bearer <key> 是否在 AUTH_KEYS 中
// ============================================================

import type { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      code: 1001,
      message: '未授权：缺少认证信息',
      data: null,
      timestamp: Date.now(),
    });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({
      code: 1001,
      message: '未授权：缺少认证信息',
      data: null,
      timestamp: Date.now(),
    });
    return;
  }

  const authKey = parts[1];

  if (!config.authKeys.includes(authKey)) {
    res.status(401).json({
      code: 1002,
      message: '未授权：authKey 无效或已过期',
      data: null,
      timestamp: Date.now(),
    });
    return;
  }

  next();
}
