import type { ErrorCode } from '@/core/errors/codes';

export interface EditorError {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

export type Result<T> = { success: true; data: T } | { success: false; error: EditorError };

export function ok<T>(data: T): Result<T> {
  return { success: true, data };
}

export function createErrorResponse(
  code: ErrorCode,
  message: string,
  details?: unknown,
): Result<never> {
  if (details === undefined) {
    return { success: false, error: { code, message } };
  }
  return { success: false, error: { code, message, details } };
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
