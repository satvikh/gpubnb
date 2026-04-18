import type { Assignment, Job, Provider } from "@/lib/types";
import type { WorkerConfig } from "./config";

async function post<T>(config: WorkerConfig, path: string, body: unknown): Promise<T> {
  const response = await fetch(`${config.apiUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(config.providerToken ? { authorization: `Bearer ${config.providerToken}` } : {})
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${path} failed: ${response.status} ${text}`);
  }

  return response.json() as Promise<T>;
}

export async function registerProvider(config: WorkerConfig) {
  return post<{ provider: Provider }>(config, "/api/providers/register", {
    name: config.machineName,
    capabilities: ["cpu", "node", "lightweight-ai"],
    hourlyRateCents: 300
  });
}

export async function sendHeartbeat(config: WorkerConfig, providerId: string) {
  return post<{ provider: Provider }>(config, "/api/providers/heartbeat", { providerId });
}

export async function pollForJob(config: WorkerConfig, providerId: string) {
  return post<{ assignment: Assignment | null; job: Job | null }>(config, "/api/worker/poll", {
    providerId
  });
}

export async function markStarted(config: WorkerConfig, providerId: string, jobId: string) {
  return post(config, `/api/jobs/${jobId}/start`, { providerId });
}

export async function reportProgress(config: WorkerConfig, providerId: string, jobId: string, message: string) {
  return post(config, `/api/jobs/${jobId}/progress`, { providerId, message });
}

export async function markComplete(config: WorkerConfig, providerId: string, jobId: string, result: string) {
  return post(config, `/api/jobs/${jobId}/complete`, { providerId, result });
}

export async function markFailed(config: WorkerConfig, providerId: string, jobId: string, error: string) {
  return post(config, `/api/jobs/${jobId}/fail`, { providerId, error });
}
