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

export interface WorkerRuntimeSnapshot {
  registered: boolean;
  machine: Machine;
  metrics: ResourceMetrics;
  activeJob: Job | null;
  recentJobs: Job[];
  earnings: Earnings;
  settings: WorkerSettings;
  networkOnline: boolean;
  workerLogs: JobLog[];
}

export interface WorkerStatusChangedEvent {
  type: "worker_status_changed";
  status: WorkerStatus;
  lastHeartbeatAt: string | null;
  uptimeSeconds: number;
}

export interface MachineDetectedEvent {
  type: "machine_detected";
  machine: Machine;
}

export interface MachineRegisteredEvent {
  type: "machine_registered";
  machine: Machine;
  settings: WorkerSettings;
}

export interface HeartbeatEvent {
  type: "heartbeat";
  at: string;
  latencyMs: number;
  uptimeSeconds: number;
}

export interface JobAssignedEvent {
  type: "job_assigned";
  job: Job;
}

export interface JobProgressEvent {
  type: "job_progress";
  job: Job;
}

export interface JobCompletedEvent {
  type: "job_completed";
  job: Job;
  recentJobs: Job[];
}

export interface MetricsUpdateEvent {
  type: "metrics_updated";
  metrics: ResourceMetrics;
}

export interface EarningsUpdateEvent {
  type: "earnings_updated";
  earnings: Earnings;
}

export interface ActivityLogEvent {
  type: "log_emitted";
  log: JobLog;
  jobId?: string | null;
}

export interface WorkerSettingsUpdatedEvent {
  type: "settings_updated";
  settings: WorkerSettings;
}

export interface WorkerErrorEvent {
  type: "worker_error";
  message: string;
  recoverable: boolean;
}

export interface WorkerSnapshotEvent {
  type: "snapshot";
  snapshot: WorkerRuntimeSnapshot;
}

export type WorkerEvent =
  | WorkerStatusChangedEvent
  | MachineDetectedEvent
  | MachineRegisteredEvent
  | HeartbeatEvent
  | JobAssignedEvent
  | JobProgressEvent
  | JobCompletedEvent
  | MetricsUpdateEvent
  | EarningsUpdateEvent
  | ActivityLogEvent
  | WorkerSettingsUpdatedEvent
  | WorkerErrorEvent
  | WorkerSnapshotEvent;

export type WorkerAction =
  | { type: "SIGN_IN"; name: string }
  | { type: "REGISTER_MACHINE"; settings: Partial<WorkerSettings> }
  | { type: "START_WORKER" }
  | { type: "STOP_WORKER" }
  | { type: "PAUSE_WORKER" }
  | { type: "RESUME_WORKER" }
  | { type: "EMERGENCY_STOP" }
  | { type: "TICK" }
  | { type: "UPDATE_SETTINGS"; settings: Partial<WorkerSettings> }
  | { type: "WORKER_EVENT"; event: WorkerEvent }
  | { type: "WORKER_SNAPSHOT"; snapshot: WorkerRuntimeSnapshot };
