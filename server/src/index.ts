// ============================================================
// AI Talent Evaluation Server — 主入口
// ============================================================

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { config } from './config.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { evaluationRouter } from './routes/evaluation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1);

// ── 全局中间件 ────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// No-store cache control for API routes
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// ── 健康检查 ─────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// ── 认证中间件 ────────────────────────────────────────────────
// 评估接口需要 Bearer token 认证
app.use('/evaluation', authMiddleware);

// ── 评估路由 ─────────────────────────────────────────────────
app.use('/evaluation', evaluationRouter);

// ── 错误处理（必须最后注册） ──────────────────────────────────
app.use(errorHandler);

// ── 启动服务 ─────────────────────────────────────────────────
app.listen(config.port, () => {
  console.log(`\n===========================================`);
  console.log(`  AI 人才评估系统 — API 服务`);
  console.log(`  Port: ${config.port}`);
  console.log(`  Mock Mode: ${config.mockMode}`);
  console.log(`  Model: ${config.geminiModel}`);
  console.log(`  Uploads: ${config.uploadDir}`);
  console.log(`===========================================\n`);
});

export default app;
