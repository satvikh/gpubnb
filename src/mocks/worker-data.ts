import type { Earnings, Job, JobLog, Machine, ResourceMetrics, WorkerSettings, WorkerState } from "@/src/types/worker";

export const detectedMachine: Machine = {
  id: "node-mac-81f4",
  name: "Satvikh's MacBook Pro",
  os: "macOS 15.4",
  cpu: "Apple M3 Pro, 11-core",
  memoryGb: 18,
  status: "offline",
  charging: true,
  cpuLimit: 62,
  autoAcceptJobs: true,
  backgroundRunning: true,
  chargingOnly: true,
  lastHeartbeatAt: null,
  uptimeSeconds: 0
};

export const initialMetrics: ResourceMetrics = {
  cpuUsage: 6,
  memoryUsage: 28,
  batteryPercent: 86,
  temperatureC: 41,
  networkMbps: 124,
  heartbeatLatencyMs: 0
};

export const initialSettings: WorkerSettings = {
  chargingOnly: true,
  cpuLimit: 62,
  backgroundRunning: true,
  autoAcceptJobs: true,
  autoStart: false,
  activeHours: "6:00 PM - 8:00 AM",
  allowedJobTypes: ["render", "simulation", "batch-inference", "compile"]
};

export const earningsHistory: Earnings["history"] = [
  { label: "Mon", amount: 11.42 },
  { label: "Tue", amount: 18.74 },
  { label: "Wed", amount: 9.6 },
  { label: "Thu", amount: 22.18 },
  { label: "Fri", amount: 16.91 },
  { label: "Sat", amount: 27.35 },
  { label: "Sun", amount: 14.7 }
];

export const seedLogs: JobLog[] = [
  {
    id: "log-boot",
    at: new Date().toISOString(),
    level: "info",
    message: "Control plane ready. Worker is waiting for a secure session."
  }
];

export const recentJobs: Job[] = [
  {
    id: "job-9812",
    name: "Protein fold sampling shard",
    type: "simulation",
    status: "completed",
    progress: 100,
    startedAt: new Date(Date.now() - 1000 * 60 * 94).toISOString(),
    estimatedCompletionAt: new Date(Date.now() - 1000 * 60 * 63).toISOString(),
    earnings: 8.72,
    cpuUsage: 61,
    memoryUsage: 44,
    logs: []
  },
  {
    id: "job-9721",
    name: "Product image render batch",
    type: "render",
    status: "completed",
    progress: 100,
    startedAt: new Date(Date.now() - 1000 * 60 * 186).toISOString(),
    estimatedCompletionAt: new Date(Date.now() - 1000 * 60 * 151).toISOString(),
    earnings: 6.25,
    cpuUsage: 55,
    memoryUsage: 39,
    logs: []
  },
  {
    id: "job-9655",
    name: "Search index compile sweep",
    type: "compile",
    status: "completed",
    progress: 100,
    startedAt: new Date(Date.now() - 1000 * 60 * 390).toISOString(),
    estimatedCompletionAt: new Date(Date.now() - 1000 * 60 * 365).toISOString(),
    earnings: 4.18,
    cpuUsage: 46,
    memoryUsage: 31,
    logs: []
  }
];

export const initialWorkerState: WorkerState = {
  signedIn: false,
  registered: false,
  userName: "Satvikh",
  machine: detectedMachine,
  metrics: initialMetrics,
  activeJob: null,
  recentJobs,
  earnings: {
    lifetime: 284.46,
    pending: 42.83,
    today: 14.21,
    completedJobs: 37,
    history: earningsHistory
  },
  settings: initialSettings,
  networkOnline: true,
  workerLogs: seedLogs
};
