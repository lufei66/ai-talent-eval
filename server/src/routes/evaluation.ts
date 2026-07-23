// ============================================================
// Evaluation routes — 上传评估 + 查询结果
// ============================================================

import express from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';

import { config } from '../config.js';
import { prisma } from '../db.js';
import { startEvaluation } from '../services/evaluator.js';
import {
  badRequest,
  unsupportedFileType,
  tooLarge,
  notFound,
} from '../utils/errors.js';
import type { ApiResponse, UploadResponse, ResultData } from '@ai-talent-eval/shared';

const router = express.Router();

// ── 确保上传目录存在 ──────────────────────────────────────────
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

// ── Multer 配置 ──────────────────────────────────────────────
const ALLOWED_VIDEO_EXTS = ['.mp4', '.mov', '.avi'];
const ALLOWED_IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];
const ALLOWED_EXTS = [...ALLOWED_VIDEO_EXTS, ...ALLOWED_IMAGE_EXTS];
const MAX_VIDEO_SIZE = 500 * 1024 * 1024;   // 500 MB
const MAX_IMAGE_SIZE = 20 * 1024 * 1024;    // 20 MB
const MAX_FILE_COUNT = 10;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_VIDEO_SIZE,
    files: MAX_FILE_COUNT,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTS.includes(ext)) {
      cb(
        unsupportedFileType(
          2002,
          `文件类型不支持：${file.originalname}。支持的格式：视频(.mp4, .mov, .avi)，图片(.jpg, .jpeg, .png, .webp)`,
        ) as any,
      );
      return;
    }
    cb(null, true);
  },
});

// ── POST /evaluation/upload ─────────────────────────────────
router.post(
  '/upload',
  upload.array('files', MAX_FILE_COUNT),
  async (req, res, next) => {
    try {
      const { candidateName, candidateId, remark, callbackUrl } = req.body;
      const files = req.files as Express.Multer.File[] || [];

      // ── 校验 ──────────────────────────────────────────────
      if (files.length === 0) {
        throw badRequest(2004, '未上传任何文件');
      }

      if (!candidateName || typeof candidateName !== 'string' || candidateName.trim().length === 0) {
        throw badRequest(2001, '请求参数校验失败：candidateName 为必填字段，长度 1-50 字符');
      }
      if (candidateName.trim().length > 50) {
        throw badRequest(2001, '请求参数校验失败：candidateName 长度不能超过 50 字符');
      }

      // 文件大小分类型校验
      for (const file of files) {
        const ext = path.extname(file.originalname).toLowerCase();
        const isVideo = ALLOWED_VIDEO_EXTS.includes(ext);
        if (isVideo && file.size > MAX_VIDEO_SIZE) {
          throw tooLarge(
            2003,
            `文件大小超出限制：${file.originalname} (${(file.size / 1024 / 1024).toFixed(1)}MB)。视频单文件最大 500MB`,
          );
        }
        if (!isVideo && file.size > MAX_IMAGE_SIZE) {
          throw tooLarge(
            2003,
            `文件大小超出限制：${file.originalname} (${(file.size / 1024 / 1024).toFixed(1)}MB)。图片单文件最大 20MB`,
          );
        }
      }

      // ── 生成 taskId ──────────────────────────────────────
      const taskId = 'eval_' + crypto.randomBytes(8).toString('hex');

      // ── 创建数据库记录 ──────────────────────────────────
      const task = await prisma.evaluationTask.create({
        data: {
          taskId,
          candidateName: candidateName.trim(),
          candidateId: candidateId || null,
          remark: remark || null,
          callbackUrl: callbackUrl || null,
          status: 'PROCESSING',
          progress: 0,
          progressDescription: '任务已创建，等待评估...',
          fileCount: files.length,
          fileUrls: files.map(f => path.relative(path.resolve('.'), f.path)),
        },
      });

      // ── 异步启动评估（不 await） ──────────────────────
      setImmediate(() => {
        startEvaluation(taskId, files, {
          taskId,
          candidateName: candidateName.trim(),
          candidateId: candidateId || null,
          remark: remark || null,
          callbackUrl: callbackUrl || null,
        }).catch(err => {
          console.error(`[Route] 异步评估异常: ${taskId}`, err.message);
        });
      });

      // ── 返回响应 ──────────────────────────────────────
      const response: ApiResponse<UploadResponse> = {
        code: 0,
        message: 'success',
        data: {
          taskId,
          status: 'PROCESSING',
          createdAt: task.createdAt.toISOString(),
        },
        timestamp: Date.now(),
      };

      return res.json(response);
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /evaluation/result ──────────────────────────────────
router.get('/result', async (req, res, next) => {
  try {
    const { taskId } = req.query;

    if (!taskId || typeof taskId !== 'string' || taskId.trim().length === 0) {
      throw badRequest(2001, '请求参数校验失败：taskId 为必填字段');
    }

    const task = await prisma.evaluationTask.findUnique({
      where: { taskId: taskId.trim() },
    });

    if (!task) {
      throw notFound(3001, '评估任务不存在');
    }

    const data: ResultData = {
      taskId: task.taskId,
      status: task.status,
      progress: task.progress,
      progressDescription: task.progressDescription || '',
      candidateName: task.candidateName,
      candidateId: task.candidateId,
      remark: task.remark,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      fileCount: task.fileCount,
    };

    if (task.status === 'COMPLETED') {
      data.completedAt = task.completedAt?.toISOString();
      data.evaluationDurationMs = task.evaluationDurationMs ?? undefined;
      data.result = (task.resultJson as any) ?? null;
    } else if (task.status === 'FAILED') {
      data.failureReason = task.failureReason ?? undefined;
      data.retryable = task.retryable;
      data.result = null;
    } else {
      data.result = null;
    }

    const response: ApiResponse<ResultData> = {
      code: 0,
      message: 'success',
      data,
      timestamp: Date.now(),
    };

    return res.json(response);
  } catch (err) {
    next(err);
  }
});

export { router as evaluationRouter };
