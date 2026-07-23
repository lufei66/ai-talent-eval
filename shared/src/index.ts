// ============================================================
// AI Talent Evaluation — 共享类型定义
// 前后端共用
// ============================================================

// ============================================================
// 评估子项
// ============================================================

export interface SubItem {
  name: string;
  score: number;
  maxScore: number;
  comment: string;
}

// ============================================================
// 评估维度
// ============================================================

export interface Dimension {
  dimensionId: number;
  name: string;
  weight: number;
  weightedScore: number;
  maxScore: number;
  subItems: SubItem[];
}

// ============================================================
// 通用标签
// ============================================================

export interface GeneralTag {
  name: string;
  value: string;
  comment: string | null;
}

// ============================================================
// 行业优势匹配度
// ============================================================

export interface IndustryAdvantage {
  name: string;
  matchLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  comment: string;
}

// ============================================================
// Gemini 原始评估结果
// ============================================================

export interface EvaluationResult {
  dimensions: Dimension[];
  generalTags: GeneralTag[];
  industryAdvantages: IndustryAdvantage[];
  overallComment: string;
}

// ============================================================
// 最终评估结果（含总分和等级）
// ============================================================

export interface EvaluationFinalResult extends EvaluationResult {
  totalScore: number;
  grade: string;
  gradeLabel: string;
}

// ============================================================
// API 通用响应格式
// ============================================================

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data?: T;
  timestamp?: number;
}

// ============================================================
// 上传响应
// ============================================================

export interface UploadResponse {
  taskId: string;
  status: string;
  createdAt: string;
}

// ============================================================
// 结果查询响应
// ============================================================

export interface ResultData {
  taskId: string;
  status: string;
  progress: number;
  progressDescription: string;
  candidateName: string;
  candidateId: string | null;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
  fileCount: number;
  completedAt?: string;
  evaluationDurationMs?: number;
  result?: EvaluationFinalResult | null;
  failureReason?: string;
  retryable?: boolean;
}
