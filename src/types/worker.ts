export type WorkerStatus = "offline" | "online" | "idle" | "busy" | "paused" | "error";

export type JobStatus = "queued" | "running" | "completed" | "failed" | "paused";

export type JobType = "render" | "simulation" | "batch-inference" | "compile" | "data-cleaning";

export type LogLevel = "info" | "success" | "warning" | "error";

export interface Machine {
  id: string;
  name: string;
  os: string;
  cpu: string;
  memoryGb: number;
  status: WorkerStatus;
  charging: boolean;
  cpuLimit: number;
  autoAcceptJobs: boolean;
  backgroundRunning: boolean;
  chargingOnly: boolean;
  lastHeartbeatAt: string | null;
  uptimeSeconds: number;
}

export interface ResourceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  batteryPercent: number;
  temperatureC: number;
  networkMbps: number;
  heartbeatLatencyMs: number;
}

export interface JobLog {
  id: string;
  at: string;
  level: LogLevel;
  message: string;
}

export interface Job {
  id: string;
  name: string;
  type: JobType;
  status: JobStatus;
  progress: number;
  startedAt: string | null;
  estimatedCompletionAt: string | null;
  earnings: number;
  cpuUsage: number;
  memoryUsage: number;
  logs: JobLog[];
}

export interface Earnings {
  lifetime: number;
  pending: number;
  today: number;
  completedJobs: number;
  history: Array<{
    label: string;
    amount: number;
  }>;
}

export interface WorkerSettings {
  chargingOnly: boolean;
  cpuLimit: number;
  backgroundRunning: boolean;
  autoAcceptJobs: boolean;
  autoStart: boolean;
  activeHours: string;
  allowedJobTypes: JobType[];
}

export interface WorkerState {
  signedIn: boolean;
  registered: boolean;
  userName: string;
  machine: Machine;
  metrics: ResourceMetrics;
  activeJob: Job | null;
  recentJobs: Job[];
  earnings: Earnings;
  settings: WorkerSettings;
  networkOnline: boolean;
  workerLogs: JobLog[];
}

export type WorkerAction =
  | { type: "SIGN_IN"; name: string }
  | { type: "REGISTER_MACHINE"; settings: Partial<WorkerSettings> }
  | { type: "START_WORKER" }
  | { type: "STOP_WORKER" }
  | { type: "PAUSE_WORKER" }
  | { type: "RESUME_WORKER" }
  | { type: "EMERGENCY_STOP" }
  | { type: "TICK" }
  | { type: "UPDATE_SETTINGS"; settings: Partial<WorkerSettings> };
