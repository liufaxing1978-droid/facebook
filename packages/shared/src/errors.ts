export const APP_ERROR_CODES = [
  "CONFIG_ERROR",
  "DATABASE_ERROR",
  "QUEUE_ERROR",
  "META_AUTH_ERROR",
  "META_PERMISSION_ERROR",
  "META_RATE_LIMIT",
  "META_API_ERROR",
  "VALIDATION_ERROR"
] as const;

export type AppErrorCode = (typeof APP_ERROR_CODES)[number];

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly cause?: unknown;

  constructor(code: AppErrorCode, message: string, options?: Readonly<{ cause?: unknown }>) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.cause = options?.cause;
  }
}
