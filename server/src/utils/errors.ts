// ============================================================
// Custom error classes with HTTP status and application code
// ============================================================

export class AppError extends Error {
  httpStatus: number;
  code: number;

  constructor(httpStatus: number, code: number, message: string) {
    super(message);
    this.httpStatus = httpStatus;
    this.code = code;
    this.name = 'AppError';
  }
}

export function unauthorized(code = 1002, message = '未授权：authKey 无效或已过期'): AppError {
  return new AppError(401, code, message);
}

export function badRequest(code = 2001, message = '请求参数校验失败'): AppError {
  return new AppError(400, code, message);
}

export function notFound(code = 3001, message = '评估任务不存在'): AppError {
  return new AppError(404, code, message);
}

export function tooLarge(code = 2003, message = '文件大小超出限制'): AppError {
  return new AppError(400, code, message);
}

export function unsupportedFileType(code = 2002, message = '文件类型不支持'): AppError {
  return new AppError(400, code, message);
}

export function internal(code = 9999, message = '服务器内部错误'): AppError {
  return new AppError(500, code, message);
}
