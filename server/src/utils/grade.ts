// ============================================================
// Grade calculation: score → grade mapping
// ============================================================

import type { EvaluationResult, EvaluationFinalResult } from '@ai-talent-eval/shared';

/**
 * 百分制总分 → 等级映射
 */
export function scoreToGrade(totalScore: number): { grade: string; gradeLabel: string } {
  if (totalScore >= 95) return { grade: 'S', gradeLabel: '顶级人才' };
  if (totalScore >= 88) return { grade: 'A+', gradeLabel: '优秀' };
  if (totalScore >= 80) return { grade: 'A', gradeLabel: '良好' };
  if (totalScore >= 70) return { grade: 'B', gradeLabel: '一般' };
  if (totalScore >= 60) return { grade: 'C', gradeLabel: '较弱' };
  return { grade: 'C-', gradeLabel: '不达标' };
}

/**
 * 计算总评分。
 *
 * 10 大维度共 20 子项，每项有独立分值，满分合计 100 分。
 * 第 10 类"话术天赋"有 6 个子项（每项满分 3 分），共 18 分，
 * 加上前 9 类 82 分 = 满分 100 分。
 */
export function calculateGrade(result: EvaluationResult): {
  totalScore: number;
  grade: string;
  gradeLabel: string;
  finalResult: EvaluationFinalResult;
} {
  let rawSum = 0;

  for (const dim of result.dimensions) {
    for (const item of dim.subItems) {
      if (typeof item.score === 'number') {
        rawSum += item.score;
      }
    }
  }

  // 满分 100 → 直接就是百分制总分，保留 1 位小数
  const totalScore = Math.round(rawSum * 10) / 10;
  const { grade, gradeLabel } = scoreToGrade(totalScore);

  const finalResult: EvaluationFinalResult = {
    ...result,
    totalScore,
    grade,
    gradeLabel,
  };

  return { totalScore, grade, gradeLabel, finalResult };
}
