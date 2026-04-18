export interface WorkerConfig {
  apiUrl: string;
  providerId?: string;
  providerToken?: string;
  machineName: string;
  heartbeatIntervalMs: number;
  pollIntervalMs: number;
}

export function getConfig(): WorkerConfig {
  return {
    apiUrl: process.env.GPUBNB_API_URL ?? "http://localhost:3000",
    providerId: process.env.GPUBNB_PROVIDER_ID,
    providerToken: process.env.GPUBNB_PROVIDER_TOKEN,
    machineName: process.env.GPUBNB_MACHINE_NAME ?? "Local Dev Machine",
    heartbeatIntervalMs: Number(process.env.GPUBNB_HEARTBEAT_INTERVAL_MS ?? 5000),
    pollIntervalMs: Number(process.env.GPUBNB_POLL_INTERVAL_MS ?? 3000)
  };
}
