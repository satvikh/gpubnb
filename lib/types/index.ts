export type JobStatus = "queued" | "assigned" | "running" | "completed" | "failed";

export type JobType = "text_generation" | "image_caption" | "embedding" | "shell_demo";

export type ProviderStatus = "online" | "offline" | "busy";

export interface Provider {
  id: string;
  name: string;
  status: ProviderStatus;
  capabilities: string[];
  hourlyRateCents: number;
  totalEarnedCents: number;
  lastHeartbeatAt?: string;
  token?: string;
  createdAt: string;
}

export interface Job {
  id: string;
  title: string;
  type: JobType;
  status: JobStatus;
  input: string;
  result?: string;
  error?: string;
  budgetCents: number;
  providerPayoutCents?: number;
  platformFeeCents?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Assignment {
  id: string;
  jobId: string;
  providerId: string;
  status: JobStatus;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface JobEvent {
  id: string;
  jobId: string;
  providerId?: string;
  type: "created" | "assigned" | "started" | "progress" | "completed" | "failed";
  message: string;
  createdAt: string;
}
