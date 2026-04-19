import type { DockerHealth, Machine, SandboxRunnerStatus, WorkerRuntimeSnapshot, WorkerSettings } from "@/src/types/worker";

export const WORKER_COMMANDS = {
  detectMachine: "detect_machine",
  registerMachine: "register_machine",
  startWorker: "start_worker",
  stopWorker: "stop_worker",
  pauseWorker: "pause_worker",
  resumeWorker: "resume_worker",
  getWorkerStatus: "get_worker_status",
  updateWorkerSettings: "update_worker_settings",
  emergencyStop: "emergency_stop",
  checkDockerHealth: "check_docker_health",
  getSandboxRunnerStatus: "get_sandbox_runner_status",
  startSandboxRunner: "start_sandbox_runner",
  stopSandboxRunner: "stop_sandbox_runner"
} as const;

function hasTauriRuntime() {
  const maybeWindow = typeof window === "undefined" ? null : (window as typeof window & { __TAURI_INTERNALS__?: unknown });
  return (
    maybeWindow !== null &&
    typeof maybeWindow.__TAURI_INTERNALS__ === "object" &&
    maybeWindow.__TAURI_INTERNALS__ !== null
  );
}

async function invokeCommand<T>(command: string, args?: Record<string, unknown>): Promise<T | null> {
  if (!hasTauriRuntime()) {
    return null;
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<T>(command, args);
  } catch {
    return null;
  }
}

export async function invokeDetectMachine() {
  return invokeCommand<Machine>(WORKER_COMMANDS.detectMachine);
}

export async function invokeRegisterMachine(settings: WorkerSettings, machine: Machine) {
  return invokeCommand<WorkerRuntimeSnapshot>(WORKER_COMMANDS.registerMachine, { settings, machine });
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

export async function invokeCheckDockerHealth() {
  return invokeCommand<DockerHealth>(WORKER_COMMANDS.checkDockerHealth);
}

export async function invokeGetSandboxRunnerStatus() {
  return invokeCommand<SandboxRunnerStatus>(WORKER_COMMANDS.getSandboxRunnerStatus);
}

export async function invokeStartSandboxRunner() {
  return invokeCommand<SandboxRunnerStatus>(WORKER_COMMANDS.startSandboxRunner);
}

export async function invokeStopSandboxRunner() {
  return invokeCommand<SandboxRunnerStatus>(WORKER_COMMANDS.stopSandboxRunner);
}
