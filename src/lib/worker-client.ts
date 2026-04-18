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
import type { WorkerEvent, WorkerRuntimeSnapshot, WorkerSettings } from "@/src/types/worker";

export interface WorkerControlClient {
  detectMachine: () => Promise<WorkerRuntimeSnapshot | null>;
  registerMachine: (settings: WorkerSettings) => Promise<WorkerRuntimeSnapshot | null>;
  startWorker: () => Promise<WorkerRuntimeSnapshot | null>;
  stopWorker: () => Promise<WorkerRuntimeSnapshot | null>;
  pauseWorker: () => Promise<WorkerRuntimeSnapshot | null>;
  resumeWorker: () => Promise<WorkerRuntimeSnapshot | null>;
  getWorkerStatus: () => Promise<WorkerRuntimeSnapshot | null>;
  updateWorkerSettings: (settings: WorkerSettings) => Promise<WorkerRuntimeSnapshot | null>;
  emergencyStop: () => Promise<WorkerRuntimeSnapshot | null>;
  subscribeToWorkerEvents: (onEvent: (event: WorkerEvent) => void) => Promise<() => void>;
}

function fallbackSnapshot(): WorkerRuntimeSnapshot {
  return {
    registered: initialWorkerState.registered,
    machine: initialWorkerState.machine,
    metrics: initialWorkerState.metrics,
    activeJob: initialWorkerState.activeJob,
    recentJobs: initialWorkerState.recentJobs,
    earnings: initialWorkerState.earnings,
    settings: initialWorkerState.settings,
    networkOnline: initialWorkerState.networkOnline,
    workerLogs: initialWorkerState.workerLogs
  };
}

function mergeSnapshot(snapshot: WorkerRuntimeSnapshot, settings?: WorkerSettings): WorkerRuntimeSnapshot {
  if (!settings) {
    return snapshot;
  }

  return {
    ...snapshot,
    settings,
    machine: {
      ...snapshot.machine,
      cpuLimit: settings.cpuLimit,
      autoAcceptJobs: settings.autoAcceptJobs,
      backgroundRunning: settings.backgroundRunning,
      chargingOnly: settings.chargingOnly
    }
  };
}

export const workerClient: WorkerControlClient = {
  async detectMachine() {
    const machine = await invokeDetectMachine();
    const snapshot = await invokeGetWorkerStatus();

    if (snapshot && machine) {
      return { ...snapshot, machine };
    }

    return machine ? { ...fallbackSnapshot(), machine } : null;
  },
  async registerMachine(settings) {
    const snapshot = await invokeRegisterMachine(settings);
    return snapshot ?? mergeSnapshot({ ...fallbackSnapshot(), registered: true }, settings);
  },
  async startWorker() {
    return invokeStartWorker();
  },
  async stopWorker() {
    return invokeStopWorker();
  },
  async pauseWorker() {
    return invokePauseWorker();
  },
  async resumeWorker() {
    return invokeResumeWorker();
  },
  async getWorkerStatus() {
    return invokeGetWorkerStatus();
  },
  async updateWorkerSettings(settings) {
    const snapshot = await invokeUpdateWorkerSettings(settings);
    return snapshot ?? mergeSnapshot(fallbackSnapshot(), settings);
  },
  async emergencyStop() {
    return invokeEmergencyStop();
  },
  subscribeToWorkerEvents(onEvent) {
    return listenToTauriWorkerEvents(onEvent);
  }
};
