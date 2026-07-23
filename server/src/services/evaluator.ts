// ============================================================
// Evaluation orchestrator — 评估流程编排
// ============================================================

import https from 'https';
import http from 'http';
import urlModule from 'url';
import { prisma } from '../db.js';
import { evaluateWithGemini } from './gemini.js';
import { calculateGrade } from '../utils/grade.js';
import type { EvaluationFinalResult } from '@ai-talent-eval/shared';

interface FileInfo {
  path: string;
  mimetype: string;
  originalname: string;
}

interface TaskData {
  taskId: string;
  candidateName: string;
  candidateId?: string | null;
  remark?: string | null;
  callbackUrl?: string | null;
}

/**
 * 启动异步评估流程
 */
export async function startEvaluation(
  taskId: string,
  files: Express.Multer.File[],
  taskData: TaskData,
): Promise<EvaluationFinalResult | void> {
  const startTime = Date.now();

  try {
    // 步骤 1: 分析文件
    await updateProgress(taskId, 10, '正在分析视频与图片...');

    // 构建文件信息列表
    const fileInfos: FileInfo[] = files.map(f => ({
      path: f.path,
      mimetype: f.mimetype,
      originalname: f.originalname,
    }));

    // 步骤 2: 调用 Gemini 评估
    await updateProgress(taskId, 30, '正在调用 AI 模型进行评估...');
    const geminiResult = await evaluateWithGemini(fileInfos, taskData.candidateName);

    // 步骤 3: 计算总分和等级
    await updateProgress(taskId, 80, '正在计算综合得分...');
    const { finalResult } = calculateGrade(geminiResult);

    // 步骤 4: 保存结果
    const durationMs = Date.now() - startTime;
    await completeTask(taskId, finalResult, durationMs);

    console.log(
      `[Evaluator] 评估完成: ${taskId}, 总分: ${finalResult.totalScore}, 等级: ${finalResult.grade}, 耗时: ${durationMs}ms`,
    );

    // 步骤 5: 异步回调通知
    if (taskData.callbackUrl) {
      sendCallback(taskData.callbackUrl, taskId, 'COMPLETED').catch(err => {
        console.error(`[Evaluator] 回调失败: ${taskData.callbackUrl}`, err.message);
      });
    }

    return finalResult;
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    console.error(`[Evaluator] 评估失败: ${taskId}`, err.message);

    const retryable = !(
      err.message.includes('文件') ||
      err.message.includes('格式')
    );

    await failTask(taskId, err.message, retryable);

    // 异步回调通知失败
    if (taskData.callbackUrl) {
      sendCallback(taskData.callbackUrl, taskId, 'FAILED').catch(() => {});
    }

    throw err;
  }
}

// ============================================================
// Prisma 数据库操作
// ============================================================

async function updateProgress(taskId: string, progress: number, description: string): Promise<void> {
  await prisma.evaluationTask.update({
    where: { taskId },
    data: {
      progress,
      progressDescription: description,
      updatedAt: new Date(),
    },
  });
}

async function completeTask(
  taskId: string,
  resultJson: EvaluationFinalResult,
  durationMs: number,
): Promise<void> {
  const now = new Date();
  await prisma.evaluationTask.update({
    where: { taskId },
    data: {
      status: 'COMPLETED',
      progress: 100,
      progressDescription: '评估完成',
      resultJson: resultJson as any,
      evaluationDurationMs: durationMs,
      completedAt: now,
      updatedAt: now,
    },
  });
}

async function failTask(taskId: string, reason: string, retryable: boolean): Promise<void> {
  await prisma.evaluationTask.update({
    where: { taskId },
    data: {
      status: 'FAILED',
      progressDescription: '评估失败',
      failureReason: reason,
      retryable,
      updatedAt: new Date(),
    },
  });
}

// ============================================================
// 回调通知
// ============================================================

async function sendCallback(
  callbackUrl: string,
  taskId: string,
  status: string,
): Promise<{ statusCode: number; body: string }> {
  const payload = JSON.stringify({
    event: 'EVALUATION_COMPLETED',
    taskId,
    status,
    completedAt: new Date().toISOString(),
  });

  const parsedUrl = new URL(callbackUrl);
  const client = parsedUrl.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const req = client.request(
      {
        method: 'POST',
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname + parsedUrl.search,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => resolve({ statusCode: res.statusCode || 0, body: data }));
      },
    );

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}
