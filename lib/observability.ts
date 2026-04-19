import crypto from "crypto";

export function requestId(request: Request) {
  return request.headers.get("x-request-id") ?? crypto.randomUUID();
}

export function logInfo(message: string, fields: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ level: "info", message, ...fields, at: new Date().toISOString() }));
}

export function logWarn(message: string, fields: Record<string, unknown> = {}) {
  console.warn(JSON.stringify({ level: "warn", message, ...fields, at: new Date().toISOString() }));
}
