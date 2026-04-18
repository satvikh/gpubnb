import type { Machine, WorkerRuntimeSnapshot, WorkerSettings } from "@/src/types/worker";

export const WORKER_COMMANDS = {
  detectMachine: "detect_machine",
  registerMachine: "register_machine",
  startWorker: "start_worker",
  stopWorker: "stop_worker",
  pauseWorker: "pause_worker",
  resumeWorker: "resume_worker",
  getWorkerStatus: "get_worker_status",
  updateWorkerSettings: "update_worker_settings",
  emergencyStop: "emergency_stop"
} as const;

function hasTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function invokeCommand<T>(command: string, args?: Record<string, unknown>): Promise<T | null> {
  if (!hasTauriRuntime()) {
    return null;
  }

  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(command, args);
}

export async function invokeDetectMachine() {
  return invokeCommand<Machine>(WORKER_COMMANDS.detectMachine);
}

export async function invokeRegisterMachine(settings: WorkerSettings) {
  return invokeCommand<WorkerRuntimeSnapshot>(WORKER_COMMANDS.registerMachine, { settings });
}

export async function invokeStartWorker() {
  return invokeCommand<WorkerRuntimeSnapshot>(WORKER_COMMANDS.startWorker);
}

export async function invokeStopWorker() {
  return invokeCommand<WorkerRuntimeSnapshot>(WORKER_COMMANDS.stopWorker);
}

export async function invokePauseWorker() {
  return invokeCommand<WorkerRuntimeSnapshot>(WORKER_COMMANDS.pauseWorker);
}

export async function invokeResumeWorker() {
  return invokeCommand<WorkerRuntimeSnapshot>(WORKER_COMMANDS.resumeWorker);
}

export async function invokeGetWorkerStatus() {
  return invokeCommand<WorkerRuntimeSnapshot>(WORKER_COMMANDS.getWorkerStatus);
}

export async function invokeUpdateWorkerSettings(settings: WorkerSettings) {
  return invokeCommand<WorkerRuntimeSnapshot>(WORKER_COMMANDS.updateWorkerSettings, { settings });
}

export async function invokeEmergencyStop() {
  return invokeCommand<WorkerRuntimeSnapshot>(WORKER_COMMANDS.emergencyStop);
}
