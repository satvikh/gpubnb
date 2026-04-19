import { initialWorkerState } from "@/src/mocks/worker-data";
import {
  invokeDetectMachine,
  invokeEmergencyStop,
  invokeGetWorkerStatus,
  invokePauseWorker,
  invokeRegisterMachine,
  invokeResumeWorker,
  invokeStartWorker,
  invokeStopWorker,
  invokeUpdateWorkerSettings
} from "@/src/lib/tauri-commands";
import { listenToTauriWorkerEvents } from "@/src/lib/tauri-events";
import type { Job, JobLog, Machine, WorkerEvent, WorkerRuntimeSnapshot, WorkerSettings } from "@/src/types/worker";

export interface WorkerControlClient {
  detectMachine: () => Promise<WorkerRuntimeSnapshot | null>;
  registerMachine: (settings: WorkerSettings, machine: Machine) => Promise<WorkerRuntimeSnapshot | null>;
  startWorker: () => Promise<WorkerRuntimeSnapshot | null>;
  stopWorker: () => Promise<WorkerRuntimeSnapshot | null>;
  pauseWorker: () => Promise<WorkerRuntimeSnapshot | null>;
  resumeWorker: () => Promise<WorkerRuntimeSnapshot | null>;
  getWorkerStatus: () => Promise<WorkerRuntimeSnapshot | null>;
  updateWorkerSettings: (settings: WorkerSettings) => Promise<WorkerRuntimeSnapshot | null>;
  emergencyStop: () => Promise<WorkerRuntimeSnapshot | null>;
  subscribeToWorkerEvents: (onEvent: (event: WorkerEvent) => void) => Promise<() => void>;
}

function hasTauriRuntime() {
  const maybeWindow = typeof window === "undefined" ? null : (window as typeof window & { __TAURI_INTERNALS__?: unknown });
  return (
    maybeWindow !== null &&
    typeof maybeWindow.__TAURI_INTERNALS__ === "object" &&
    maybeWindow.__TAURI_INTERNALS__ !== null
  );
}

let mockSnapshot: WorkerRuntimeSnapshot = {
  registered: initialWorkerState.registered,
  availability: initialWorkerState.availability,
  machine: initialWorkerState.machine,
  metrics: initialWorkerState.metrics,
  activeJob: initialWorkerState.activeJob,
  latestOutput: initialWorkerState.latestOutput,
  recentJobs: initialWorkerState.recentJobs,
  earnings: initialWorkerState.earnings,
  settings: initialWorkerState.settings,
  networkOnline: initialWorkerState.networkOnline,
  workerLogs: initialWorkerState.workerLogs
};

let heartbeatTick = 0;
let mockJobStartedAtMs = 0;

function cloneSnapshot(snapshot: WorkerRuntimeSnapshot): WorkerRuntimeSnapshot {
  return structuredClone(snapshot);
}

function normalizeSnapshot(snapshot: WorkerRuntimeSnapshot | null): WorkerRuntimeSnapshot | null {
  if (!snapshot) {
    return null;
  }

  return {
    registered: snapshot.registered ?? mockSnapshot.registered,
    availability: snapshot.availability ?? (snapshot.machine.status === "offline" ? "inactive" : "active"),
    machine: {
      ...mockSnapshot.machine,
      ...snapshot.machine
    },
    metrics: {
      ...mockSnapshot.metrics,
      ...snapshot.metrics
    },
    activeJob: snapshot.activeJob ?? null,
    latestOutput:
      snapshot.latestOutput ??
      (snapshot.activeJob
        ? {
            jobId: snapshot.activeJob.id,
            jobName: snapshot.activeJob.name,
            state: "running",
            summary: `${snapshot.activeJob.progress.toFixed(0)}% complete`,
            detail: snapshot.activeJob.executionOutput ?? "Latest output is still running.",
            updatedAt: snapshot.activeJob.startedAt
          }
        : mockSnapshot.latestOutput),
    recentJobs: snapshot.recentJobs ?? mockSnapshot.recentJobs,
    earnings: {
      ...mockSnapshot.earnings,
      ...snapshot.earnings
    },
    settings: {
      ...mockSnapshot.settings,
      ...snapshot.settings
    },
    networkOnline: snapshot.networkOnline ?? mockSnapshot.networkOnline,
    workerLogs: snapshot.workerLogs?.length ? snapshot.workerLogs : mockSnapshot.workerLogs
  };
}

function log(level: JobLog["level"], message: string): JobLog {
  return {
    id: `log-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    at: new Date().toISOString(),
    level,
    message
  };
}

function pushWorkerLog(level: JobLog["level"], message: string) {
  mockSnapshot = {
    ...mockSnapshot,
    workerLogs: [log(level, message), ...mockSnapshot.workerLogs].slice(0, 40)
  };
}

function applySettings(settings: WorkerSettings) {
  mockSnapshot = {
    ...mockSnapshot,
    settings,
    machine: {
      ...mockSnapshot.machine,
      cpuLimit: settings.cpuLimit,
      autoAcceptJobs: settings.autoAcceptJobs,
      backgroundRunning: settings.backgroundRunning,
      chargingOnly: settings.chargingOnly
    }
  };
}

function createJob(): Job {
  const now = Date.now();
  const id = `job-${Math.floor(now / 1000)}`;
  const cpuUsage = Math.min(96, Math.max(34, mockSnapshot.settings.cpuLimit - 6));
  const memoryUsage = Math.min(78, Math.max(28, Math.round(mockSnapshot.machine.memoryGb * 2.1)));

  return {
    id,
    name: "MVP artifact bundle",
    type: "compile",
    status: "running",
    progress: 8,
    startedAt: new Date(now).toISOString(),
    estimatedCompletionAt: new Date(now + 1000 * 60 * 8).toISOString(),
    earnings: 3.4,
    cpuUsage,
    memoryUsage,
    logs: [log("info", "Producer accepted one trusted job for this machine.")],
    executionOutput: "Output manifest initializing locally."
  };
}

function beginMockJob() {
  const job = createJob();
  mockJobStartedAtMs = Date.now();
  mockSnapshot = {
    ...mockSnapshot,
    availability: "active",
    machine: {
      ...mockSnapshot.machine,
      status: "busy",
      lastHeartbeatAt: new Date().toISOString()
    },
    activeJob: job,
    latestOutput: {
      jobId: job.id,
      jobName: job.name,
      state: "running",
      summary: "Producing latest output",
      detail: job.executionOutput ?? "Output stream initializing.",
      updatedAt: job.startedAt
    },
    metrics: {
      ...mockSnapshot.metrics,
      cpuUsage: job.cpuUsage,
      memoryUsage: job.memoryUsage,
      heartbeatLatencyMs: 38
    }
  };
  pushWorkerLog("info", "Worker activated. One-job-at-a-time producer flow engaged.");
}

function completeMockJob() {
  if (!mockSnapshot.activeJob) {
    return;
  }

  const completedAt = new Date().toISOString();
  const completedJob: Job = {
    ...mockSnapshot.activeJob,
    status: "completed",
    progress: 100,
    estimatedCompletionAt: completedAt,
    earnings: 4.92,
    executionOutput: "Result archive uploaded and verification passed.",
    logs: [log("success", "Output package finalized and handed back to coordinator."), ...mockSnapshot.activeJob.logs].slice(0, 16)
  };

  mockSnapshot = {
    ...mockSnapshot,
    activeJob: null,
    machine: {
      ...mockSnapshot.machine,
      status: mockSnapshot.availability === "active" ? "idle" : "offline",
      lastHeartbeatAt: completedAt
    },
    latestOutput: {
      jobId: completedJob.id,
      jobName: completedJob.name,
      state: "ready",
      summary: "Latest output verified",
      detail: completedJob.executionOutput ?? "Latest output finished.",
      updatedAt: completedAt
    },
    recentJobs: [completedJob, ...mockSnapshot.recentJobs].slice(0, 6),
    earnings: {
      ...mockSnapshot.earnings,
      lifetime: mockSnapshot.earnings.lifetime + completedJob.earnings,
      pending: mockSnapshot.earnings.pending + completedJob.earnings,
      today: mockSnapshot.earnings.today + completedJob.earnings,
      completedJobs: mockSnapshot.earnings.completedJobs + 1
    },
    metrics: {
      ...mockSnapshot.metrics,
      cpuUsage: 11,
      memoryUsage: 26
    }
  };
  pushWorkerLog("success", "Current job completed. Machine is ready for the next assignment.");
}

function progressMockJob() {
  const job = mockSnapshot.activeJob;
  if (!job || mockSnapshot.machine.status === "paused" || mockSnapshot.availability !== "active") {
    return;
  }

  const elapsedMs = Date.now() - mockJobStartedAtMs;
  const progress = Math.min(100, 8 + Math.floor((elapsedMs / (1000 * 60 * 8)) * 92));
  const executionOutput =
    progress >= 100
      ? "Final output packaging complete."
      : `Chunk ${Math.max(1, Math.floor(progress / 12))} rendered locally with owner limits enforced.`;

  mockSnapshot = {
    ...mockSnapshot,
    activeJob: {
      ...job,
      progress,
      executionOutput,
      logs:
        progress >= 100
          ? job.logs
          : [log("info", `Producer progress updated to ${progress}%.`), ...job.logs].slice(0, 16)
    },
    latestOutput: {
      jobId: job.id,
      jobName: job.name,
      state: "running",
      summary: `${progress}% complete`,
      detail: executionOutput,
      updatedAt: new Date().toISOString()
    },
    machine: {
      ...mockSnapshot.machine,
      status: "busy",
      lastHeartbeatAt: new Date().toISOString(),
      uptimeSeconds: mockSnapshot.machine.uptimeSeconds + 5
    },
    metrics: {
      ...mockSnapshot.metrics,
      cpuUsage: Math.min(96, job.cpuUsage + (heartbeatTick % 6)),
      memoryUsage: Math.min(82, job.memoryUsage + (heartbeatTick % 4)),
      heartbeatLatencyMs: 34 + (heartbeatTick % 7)
    }
  };

  if (progress >= 100) {
    completeMockJob();
  }
}

function advanceMockRuntime() {
  heartbeatTick += 1;

  if (mockSnapshot.availability !== "active") {
    mockSnapshot = {
      ...mockSnapshot,
      machine: {
        ...mockSnapshot.machine,
        uptimeSeconds: 0,
        lastHeartbeatAt: null
      },
      metrics: {
        ...mockSnapshot.metrics,
        cpuUsage: 4,
        heartbeatLatencyMs: 0
      }
    };
    return;
  }

  mockSnapshot = {
    ...mockSnapshot,
    machine: {
      ...mockSnapshot.machine,
      lastHeartbeatAt: new Date().toISOString(),
      uptimeSeconds: mockSnapshot.machine.uptimeSeconds + 5
    },
    metrics: {
      ...mockSnapshot.metrics,
      batteryPercent: mockSnapshot.machine.charging ? mockSnapshot.metrics.batteryPercent : Math.max(18, mockSnapshot.metrics.batteryPercent - 0.1),
      networkMbps: 96 + (heartbeatTick % 18),
      heartbeatLatencyMs: 32 + (heartbeatTick % 6)
    }
  };

  if (mockSnapshot.activeJob) {
    progressMockJob();
    return;
  }

  if (mockSnapshot.machine.status !== "paused") {
    mockSnapshot = {
      ...mockSnapshot,
      machine: {
        ...mockSnapshot.machine,
        status: "idle"
      }
    };
  }
}

function fallbackSnapshot(): WorkerRuntimeSnapshot {
  return cloneSnapshot(mockSnapshot);
}

export const workerClient: WorkerControlClient = {
  async detectMachine() {
    const machine = await invokeDetectMachine();
    const snapshot = normalizeSnapshot(await invokeGetWorkerStatus());

    if (snapshot && machine) {
      return { ...snapshot, machine };
    }

    if (machine) {
      mockSnapshot = {
        ...mockSnapshot,
        machine: {
          ...mockSnapshot.machine,
          ...machine
        }
      };
    }

    return fallbackSnapshot();
  },
  async registerMachine(settings, machine) {
    const snapshot = normalizeSnapshot(await invokeRegisterMachine(settings, machine));
    if (snapshot) {
      return snapshot;
    }

    applySettings(settings);
    mockSnapshot = {
      ...mockSnapshot,
      registered: true,
      availability: "inactive",
      machine: {
        ...mockSnapshot.machine,
        ...machine,
        status: "offline"
      },
      latestOutput: {
        ...mockSnapshot.latestOutput,
        state: "idle",
        summary: "Machine registered locally",
        detail: "This provider is ready. Flip availability to active to accept one job at a time.",
        updatedAt: new Date().toISOString()
      }
    };
    pushWorkerLog("success", "Machine registration finished on this device.");
    return fallbackSnapshot();
  },
  async startWorker() {
    const snapshot = normalizeSnapshot(await invokeStartWorker());
    if (snapshot) {
      return snapshot;
    }

    mockSnapshot = {
      ...mockSnapshot,
      availability: "active",
      machine: {
        ...mockSnapshot.machine,
        status: "idle"
      }
    };
    beginMockJob();
    return fallbackSnapshot();
  },
  async stopWorker() {
    const snapshot = normalizeSnapshot(await invokeStopWorker());
    if (snapshot) {
      return snapshot;
    }

    mockSnapshot = {
      ...mockSnapshot,
      availability: "inactive",
      activeJob: null,
      machine: {
        ...mockSnapshot.machine,
        status: "offline",
        uptimeSeconds: 0,
        lastHeartbeatAt: null
      },
      latestOutput: {
        ...mockSnapshot.latestOutput,
        state: "idle",
        summary: "Provider inactive",
        detail: "Availability is off. No new jobs will be accepted on this machine.",
        updatedAt: new Date().toISOString()
      },
      metrics: {
        ...mockSnapshot.metrics,
        cpuUsage: 4,
        memoryUsage: 24,
        heartbeatLatencyMs: 0
      }
    };
    pushWorkerLog("warning", "Provider availability turned off.");
    return fallbackSnapshot();
  },
  async pauseWorker() {
    const snapshot = normalizeSnapshot(await invokePauseWorker());
    if (snapshot) {
      return snapshot;
    }

    mockSnapshot = {
      ...mockSnapshot,
      machine: {
        ...mockSnapshot.machine,
        status: "paused"
      },
      latestOutput: {
        ...mockSnapshot.latestOutput,
        summary: "Producer paused",
        detail: "Current work is paused locally until the provider is resumed.",
        updatedAt: new Date().toISOString()
      }
    };
    pushWorkerLog("warning", "Provider paused the current job.");
    return fallbackSnapshot();
  },
  async resumeWorker() {
    const snapshot = normalizeSnapshot(await invokeResumeWorker());
    if (snapshot) {
      return snapshot;
    }

    mockSnapshot = {
      ...mockSnapshot,
      machine: {
        ...mockSnapshot.machine,
        status: mockSnapshot.activeJob ? "busy" : "idle"
      },
      latestOutput: {
        ...mockSnapshot.latestOutput,
        summary: mockSnapshot.activeJob ? "Producer resumed" : "Provider active",
        detail: mockSnapshot.activeJob ? "Current work resumed on this machine." : "Waiting for the next single assignment.",
        updatedAt: new Date().toISOString()
      }
    };
    pushWorkerLog("info", "Provider resumed.");
    return fallbackSnapshot();
  },
  async getWorkerStatus() {
    const snapshot = normalizeSnapshot(await invokeGetWorkerStatus());
    return snapshot ?? fallbackSnapshot();
  },
  async updateWorkerSettings(settings) {
    const snapshot = normalizeSnapshot(await invokeUpdateWorkerSettings(settings));
    if (snapshot) {
      return snapshot;
    }

    applySettings(settings);
    pushWorkerLog("info", "Local provider settings updated.");
    return fallbackSnapshot();
  },
  async emergencyStop() {
    const snapshot = normalizeSnapshot(await invokeEmergencyStop());
    if (snapshot) {
      return snapshot;
    }

    mockSnapshot = {
      ...mockSnapshot,
      availability: "inactive",
      activeJob: null,
      machine: {
        ...mockSnapshot.machine,
        status: "offline",
        uptimeSeconds: 0,
        lastHeartbeatAt: null
      },
      latestOutput: {
        ...mockSnapshot.latestOutput,
        state: "failed",
        summary: "Latest run interrupted",
        detail: "Emergency stop cut off the current producer session.",
        updatedAt: new Date().toISOString()
      }
    };
    pushWorkerLog("error", "Emergency stop triggered from provider controls.");
    return fallbackSnapshot();
  },
  async subscribeToWorkerEvents(onEvent) {
    const tauriUnlisten = await listenToTauriWorkerEvents(onEvent);

    if (hasTauriRuntime()) {
      return tauriUnlisten;
    }

    const intervalId = window.setInterval(() => {
      advanceMockRuntime();
      onEvent({ type: "snapshot", snapshot: fallbackSnapshot() });
    }, 5000);

    return () => {
      tauriUnlisten();
      window.clearInterval(intervalId);
    };
  }
};
