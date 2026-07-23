// ============================================================
// Config: environment variables with defaults
// ============================================================

import 'dotenv/config';
import path from 'path';

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),

  // Bearer token 认证密钥列表，逗号分隔
  authKeys: (process.env.AUTH_KEYS || '')
    .split(',')
    .map(k => k.trim())
    .filter(Boolean),

  // Gemini AI 配置
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',

  // Mock 模式：跳过 Gemini API，返回模拟评估结果
  mockMode: process.env.MOCK_MODE === 'true',

  // 上传目录
  uploadDir: path.resolve(process.env.UPLOAD_DIR || './uploads'),
} as const;
