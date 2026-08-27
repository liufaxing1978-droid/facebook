export type MetaErrorCode =
  | "META_AUTH_ERROR"
  | "META_PERMISSION_ERROR"
  | "META_RATE_LIMIT"
  | "META_API_ERROR";

export class MetaClientError extends Error {
  readonly code: MetaErrorCode;
  readonly status?: number;
  readonly metaCode?: number;
  readonly cause?: unknown;

  constructor(
    code: MetaErrorCode,
    message: string,
    options?: Readonly<{ status?: number; metaCode?: number; cause?: unknown }>
  ) {
    super(message);
    this.name = "MetaClientError";
    this.code = code;
    if (options?.status !== undefined) this.status = options.status;
    if (options?.metaCode !== undefined) this.metaCode = options.metaCode;
    if (options?.cause !== undefined) this.cause = options.cause;
  }
}

type GraphError = Readonly<{
  message?: string;
  code?: number;
}>;

function asGraphError(value: unknown): GraphError | undefined {
  if (typeof value !== "object" || value === null || !("error" in value)) return undefined;
  const error = (value as { error?: unknown }).error;
  if (typeof error !== "object" || error === null) return undefined;

  const record = error as Record<string, unknown>;
  return {
    ...(typeof record.message === "string" ? { message: record.message } : {}),
    ...(typeof record.code === "number" ? { code: record.code } : {})
  };
}

const RATE_LIMIT_CODES = new Set([4, 17, 32, 613]);
const PERMISSION_CODES = new Set([10, 200, 294]);

export function mapMetaHttpError(status: number, payload: unknown): MetaClientError {
  const graphError = asGraphError(payload);
  const metaCode = graphError?.code;
  const safeMessage = graphError?.message ?? `Meta Graph request failed with HTTP ${status}`;

  if (status === 429 || (metaCode !== undefined && RATE_LIMIT_CODES.has(metaCode))) {
    return new MetaClientError("META_RATE_LIMIT", safeMessage, { status, ...(metaCode !== undefined ? { metaCode } : {}) });
  }

  if (metaCode === 190 || status === 401) {
    return new MetaClientError("META_AUTH_ERROR", safeMessage, { status, ...(metaCode !== undefined ? { metaCode } : {}) });
  }

  if (status === 403 || (metaCode !== undefined && PERMISSION_CODES.has(metaCode))) {
    return new MetaClientError("META_PERMISSION_ERROR", safeMessage, {
      status,
      ...(metaCode !== undefined ? { metaCode } : {})
    });
  }

  return new MetaClientError("META_API_ERROR", safeMessage, {
    status,
    ...(metaCode !== undefined ? { metaCode } : {})
  });
}
