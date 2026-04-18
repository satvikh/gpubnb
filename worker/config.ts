export interface WorkerConfig {
  apiUrl: string;
  providerId?: string;
  providerToken?: string;
  machineName: string;
  heartbeatIntervalMs: number;
  pollIntervalMs: number;
  executionStepMs: number;
}

function readPositiveNumber(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(value) || value <= 0) {
    console.warn(`Invalid ${name}; using ${fallback}ms`);
    return fallback;
  }
  return value;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function getConfig(): WorkerConfig {
  return {
    apiUrl: trimTrailingSlash(process.env.GPUBNB_API_URL ?? "http://localhost:3000"),
    providerId: process.env.GPUBNB_PROVIDER_ID,
    providerToken: process.env.GPUBNB_PROVIDER_TOKEN,
    machineName: process.env.GPUBNB_MACHINE_NAME ?? "Local Dev Machine",
    heartbeatIntervalMs: readPositiveNumber("GPUBNB_HEARTBEAT_INTERVAL_MS", 5000),
    pollIntervalMs: readPositiveNumber("GPUBNB_POLL_INTERVAL_MS", 5000),
    executionStepMs: readPositiveNumber("GPUBNB_EXECUTION_STEP_MS", 1000)
  };
}
