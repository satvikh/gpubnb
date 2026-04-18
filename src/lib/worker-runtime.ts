import { initialWorkerState } from "@/src/mocks/worker-data";
import type { Job, JobLog, WorkerAction, WorkerState } from "@/src/types/worker";

const jobNames = [
  "Neural texture baking batch",
  "Monte Carlo pricing sweep",
  "Synthetic dataset generation",
  "CI compile acceleration shard",
  "Video thumbnail render pack"
];

const jobTypes: Job["type"][] = ["render", "simulation", "batch-inference", "compile", "data-cleaning"];

const logMessages = [
  "Verified sandbox profile and payout contract.",
  "Pulled encrypted workload bundle.",
  "Allocated local CPU budget inside user limit.",
  "Checkpoint uploaded to ComputeBNB relay.",
  "Progress heartbeat accepted by scheduler.",
  "Thermal headroom is healthy.",
  "Output chunk sealed and queued for delivery."
];

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function money(value: number) {
  return Math.round(value * 100) / 100;
}

function log(message: string, level: JobLog["level"] = "info"): JobLog {
  return {
    id: `log-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    at: new Date().toISOString(),
    level,
    message
  };
}

function createJob(): Job {
  const startedAt = Date.now();
  return {
    id: `job-${Math.floor(1000 + Math.random() * 9000)}`,
    name: jobNames[Math.floor(Math.random() * jobNames.length)],
    type: jobTypes[Math.floor(Math.random() * jobTypes.length)],
    status: "running",
    progress: 2,
    startedAt: new Date(startedAt).toISOString(),
    estimatedCompletionAt: new Date(startedAt + 1000 * 55).toISOString(),
    earnings: 0.08,
    cpuUsage: 48,
    memoryUsage: 32,
    logs: [
      log("Job accepted automatically. Preparing isolated runtime.", "success"),
      log("Runtime attestation complete.")
    ]
  };
}

export function reduceWorkerState(state: WorkerState, action: WorkerAction): WorkerState {
  switch (action.type) {
    case "SIGN_IN":
      return {
        ...state,
        signedIn: true,
        userName: action.name,
        workerLogs: [log(`Signed in as ${action.name}.`), ...state.workerLogs]
      };
    case "REGISTER_MACHINE": {
      const settings = { ...state.settings, ...action.settings };
      return {
        ...state,
        registered: true,
        settings,
        machine: {
          ...state.machine,
          cpuLimit: settings.cpuLimit,
          autoAcceptJobs: settings.autoAcceptJobs,
          backgroundRunning: settings.backgroundRunning,
          chargingOnly: settings.chargingOnly
        },
        workerLogs: [log("Machine registered and trust policy saved.", "success"), ...state.workerLogs]
      };
    }
    case "START_WORKER":
      return {
        ...state,
        machine: {
          ...state.machine,
          status: "online",
          lastHeartbeatAt: new Date().toISOString()
        },
        workerLogs: [log("Worker started. Establishing scheduler session.", "success"), ...state.workerLogs]
      };
    case "STOP_WORKER":
      return {
        ...state,
        activeJob: state.activeJob ? { ...state.activeJob, status: "paused" } : null,
        machine: { ...state.machine, status: "offline", uptimeSeconds: 0 },
        metrics: { ...state.metrics, cpuUsage: 5, memoryUsage: 25, heartbeatLatencyMs: 0 },
        workerLogs: [log("Worker stopped by owner.", "warning"), ...state.workerLogs]
      };
    case "PAUSE_WORKER":
      return {
        ...state,
        machine: { ...state.machine, status: "paused" },
        workerLogs: [log("Worker paused. No new jobs will be accepted.", "warning"), ...state.workerLogs]
      };
    case "RESUME_WORKER":
      return {
        ...state,
        machine: { ...state.machine, status: state.activeJob ? "busy" : "idle" },
        workerLogs: [log("Worker resumed.", "success"), ...state.workerLogs]
      };
    case "EMERGENCY_STOP":
      return {
        ...state,
        activeJob: null,
        machine: { ...state.machine, status: "offline", uptimeSeconds: 0 },
        metrics: { ...state.metrics, cpuUsage: 3, memoryUsage: 22, heartbeatLatencyMs: 0 },
        workerLogs: [log("Emergency disconnect complete. Credentials remain local.", "error"), ...state.workerLogs]
      };
    case "UPDATE_SETTINGS": {
      const settings = { ...state.settings, ...action.settings };
      return {
        ...state,
        settings,
        machine: {
          ...state.machine,
          cpuLimit: settings.cpuLimit,
          autoAcceptJobs: settings.autoAcceptJobs,
          backgroundRunning: settings.backgroundRunning,
          chargingOnly: settings.chargingOnly
        },
        workerLogs: [log("Worker preferences updated."), ...state.workerLogs]
      };
    }
    case "TICK":
      return tick(state);
    default:
      return state;
  }
}

function tick(state: WorkerState): WorkerState {
  if (state.machine.status === "offline" || state.machine.status === "paused" || state.machine.status === "error") {
    return {
      ...state,
      metrics: {
        ...state.metrics,
        cpuUsage: clamp(state.metrics.cpuUsage + (Math.random() * 4 - 2), 2, 14),
        memoryUsage: clamp(state.metrics.memoryUsage + (Math.random() * 2 - 1), 20, 34),
        batteryPercent: clamp(state.metrics.batteryPercent - 0.01, 1, 100),
        temperatureC: clamp(state.metrics.temperatureC + (Math.random() * 2 - 1), 37, 45)
      }
    };
  }

  const shouldAssignJob = !state.activeJob && state.machine.status !== "busy" && state.settings.autoAcceptJobs && Math.random() > 0.7;
  if (shouldAssignJob) {
    const nextJob = createJob();
    return {
      ...state,
      activeJob: nextJob,
      machine: {
        ...state.machine,
        status: "busy",
        lastHeartbeatAt: new Date().toISOString(),
        uptimeSeconds: state.machine.uptimeSeconds + 2
      },
      metrics: {
        ...state.metrics,
        cpuUsage: clamp(nextJob.cpuUsage + Math.random() * 8, 35, state.settings.cpuLimit),
        memoryUsage: clamp(nextJob.memoryUsage + Math.random() * 5, 28, 72),
        temperatureC: clamp(state.metrics.temperatureC + 2, 39, 72),
        heartbeatLatencyMs: Math.round(24 + Math.random() * 36)
      },
      workerLogs: [log(`Scheduler assigned ${nextJob.name}.`, "success"), ...state.workerLogs]
    };
  }

  if (!state.activeJob) {
    return {
      ...state,
      machine: {
        ...state.machine,
        status: "idle",
        lastHeartbeatAt: new Date().toISOString(),
        uptimeSeconds: state.machine.uptimeSeconds + 2
      },
      metrics: {
        ...state.metrics,
        cpuUsage: clamp(12 + Math.random() * 10, 8, 24),
        memoryUsage: clamp(29 + Math.random() * 8, 24, 42),
        temperatureC: clamp(40 + Math.random() * 5, 38, 50),
        networkMbps: clamp(105 + Math.random() * 44, 60, 180),
        heartbeatLatencyMs: Math.round(18 + Math.random() * 28)
      }
    };
  }

  const nextProgress = clamp(state.activeJob.progress + 7 + Math.random() * 10, 0, 100);
  const nextJobLog = Math.random() > 0.45 ? log(logMessages[Math.floor(Math.random() * logMessages.length)]) : null;
  const nextJob: Job = {
    ...state.activeJob,
    progress: nextProgress,
    earnings: money(state.activeJob.earnings + 0.22 + Math.random() * 0.45),
    cpuUsage: clamp(40 + Math.random() * state.settings.cpuLimit, 24, state.settings.cpuLimit),
    memoryUsage: clamp(36 + Math.random() * 22, 26, 70),
    logs: nextJobLog ? [nextJobLog, ...state.activeJob.logs].slice(0, 16) : state.activeJob.logs
  };

  if (nextProgress >= 100) {
    const completedJob = {
      ...nextJob,
      status: "completed" as const,
      progress: 100,
      logs: [log("Job completed. Results delivered and payout credited.", "success"), ...nextJob.logs]
    };
    return {
      ...state,
      activeJob: null,
      recentJobs: [completedJob, ...state.recentJobs].slice(0, 8),
      earnings: {
        ...state.earnings,
        lifetime: money(state.earnings.lifetime + completedJob.earnings),
        pending: money(state.earnings.pending + completedJob.earnings),
        today: money(state.earnings.today + completedJob.earnings),
        completedJobs: state.earnings.completedJobs + 1
      },
      machine: {
        ...state.machine,
        status: "idle",
        lastHeartbeatAt: new Date().toISOString(),
        uptimeSeconds: state.machine.uptimeSeconds + 2
      },
      metrics: {
        ...state.metrics,
        cpuUsage: 16,
        memoryUsage: 31,
        heartbeatLatencyMs: Math.round(18 + Math.random() * 25)
      },
      workerLogs: [log(`${completedJob.name} completed. Earned $${completedJob.earnings.toFixed(2)}.`, "success"), ...state.workerLogs]
    };
  }

  return {
    ...state,
    activeJob: nextJob,
    machine: {
      ...state.machine,
      status: "busy",
      lastHeartbeatAt: new Date().toISOString(),
      uptimeSeconds: state.machine.uptimeSeconds + 2
    },
    metrics: {
      ...state.metrics,
      cpuUsage: nextJob.cpuUsage,
      memoryUsage: nextJob.memoryUsage,
      batteryPercent: clamp(state.metrics.batteryPercent - 0.03, 1, 100),
      temperatureC: clamp(43 + nextJob.cpuUsage / 5 + Math.random() * 3, 40, 78),
      networkMbps: clamp(90 + Math.random() * 80, 48, 220),
      heartbeatLatencyMs: Math.round(22 + Math.random() * 42)
    }
  };
}

export function createInitialWorkerState() {
  return initialWorkerState;
}
