/**
 * @file logger.ts
 * Satu-satunya modul di dalam src/ yang diizinkan memanggil console.*.
 * Menerapkan daftar izin ketat (allowlist) pada kunci dan penyaringan (scrubber)
 * pola data sensitif pada nilai string.
 */

export const ALLOWED_LOG_KEYS = [
  "event",
  "requestId",
  "route",
  "method",
  "status",
  "durationMs",
  "errorCode",
  "count",
] as const;

export type AllowedLogKey = (typeof ALLOWED_LOG_KEYS)[number];

export const FORBIDDEN_LOG_FIELDS = [
  "nama_panggilan",
  "preferred_name",
  "telepon",
  "phone",
  "email",
  "token",
  "kode",
  "otp",
  "catatan_pasien",
  "catatan_petugas",
  "staff_note",
  "patient_note",
  "kebutuhan",
  "shared_fields",
  "diagnosis",
  "diagnosa",
  "ip",
] as const;

export interface LogEntry {
  event: string;
  requestId?: string;
  route?: string;
  method?: string;
  status?: number;
  durationMs?: number;
  errorCode?: string;
  count?: number;
  [key: string]: unknown;
}

export interface SerializedError {
  name: string;
  code?: string;
  message: string;
}

export type LogLevel = "info" | "warn" | "error";

export type LogSink = (level: LogLevel, data: Record<string, unknown>) => void;

// Pola penyaringan regex
const PHONE_PATTERN = /(?:\+62|62|08)(?:[\s-]?\d){7,13}\b/g;
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
// Token (>= 20 karakter base32/base64url/hex). Menjaga UUID standar (8-4-4-4-12) agar requestId valid tetap utuh.
const TOKEN_OR_UUID_PATTERN =
  /([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})|([A-Za-z0-9+/=_-]{20,})/g;

/**
 * Menyaring nilai string dari nomor telepon, email, dan string mirip token.
 */
export function sanitizeString(val: string): string {
  return val
    .replace(PHONE_PATTERN, "[REDACTED_PHONE]")
    .replace(EMAIL_PATTERN, "[REDACTED_EMAIL]")
    .replace(TOKEN_OR_UUID_PATTERN, (match, uuid) => {
      if (uuid) return uuid;
      return "[REDACTED_TOKEN]";
    });
}

/**
 * Menyaring dan menyederhanakan error.
 * Hanya mengembalikan name, kode SQLSTATE (atau err.code), dan message yang sudah disaring.
 * Membuang detail, where, hint, parameter, query, dan properti internal pg lainnya.
 */
export function serializeError(err: unknown): SerializedError {
  if (typeof err === "object" && err !== null) {
    const obj = err as Record<string, unknown>;
    const name =
      typeof obj.name === "string" && obj.name.trim() !== ""
        ? obj.name
        : err instanceof Error
        ? err.name || "Error"
        : "Error";

    const code =
      typeof obj.code === "string" && obj.code.trim() !== ""
        ? obj.code
        : undefined;

    const rawMessage =
      typeof obj.message === "string"
        ? obj.message
        : err instanceof Error
        ? err.message
        : "";

    return {
      name,
      ...(code ? { code } : {}),
      message: sanitizeString(rawMessage),
    };
  }

  if (typeof err === "string") {
    return {
      name: "Error",
      message: sanitizeString(err),
    };
  }

  return {
    name: "UnknownError",
    message: sanitizeString(String(err ?? "")),
  };
}

function filterEntry(entry: LogEntry): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const key of ALLOWED_LOG_KEYS) {
    if (key in entry && entry[key] !== undefined && entry[key] !== null) {
      const val = entry[key];
      if (typeof val === "string") {
        result[key] = sanitizeString(val);
      } else if (typeof val === "number" || typeof val === "boolean") {
        result[key] = val;
      } else {
        result[key] = sanitizeString(String(val));
      }
    }
  }

  return result;
}

const defaultConsoleSink: LogSink = (level, data) => {
  const output = JSON.stringify(data);
  switch (level) {
    case "error":
      console.error(output);
      break;
    case "warn":
      console.warn(output);
      break;
    case "info":
    default:
      console.info(output);
      break;
  }
};

let currentSink: LogSink = defaultConsoleSink;

export function setLogSink(sink: LogSink): void {
  currentSink = sink;
}

export function resetLogSink(): void {
  currentSink = defaultConsoleSink;
}

export const logger = {
  info(entry: LogEntry): void {
    currentSink("info", filterEntry(entry));
  },
  warn(entry: LogEntry): void {
    currentSink("warn", filterEntry(entry));
  },
  error(entry: LogEntry): void {
    currentSink("error", filterEntry(entry));
  },
};
