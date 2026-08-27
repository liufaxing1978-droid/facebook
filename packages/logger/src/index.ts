import pino, { type DestinationStream, type Logger } from "pino";

const REDACT_PATHS = [
  "token",
  "access_token",
  "META_SYSTEM_USER_TOKEN",
  "META_APP_SECRET",
  "*.token",
  "*.access_token",
  "*.META_SYSTEM_USER_TOKEN",
  "*.META_APP_SECRET"
] as const;

export type CreateLoggerOptions = Readonly<{
  stream?: DestinationStream;
  level?: string;
}>;

export function createLogger(options: CreateLoggerOptions = {}): Logger {
  return pino(
    {
      level: options.level ?? "info",
      redact: {
        paths: [...REDACT_PATHS],
        censor: "[REDACTED]"
      }
    },
    options.stream
  );
}
