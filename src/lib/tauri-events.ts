import type { WorkerEvent } from "@/src/types/worker";

export const WORKER_EVENT_NAMES = {
  statusChanged: "worker-status-changed",
  heartbeat: "worker-heartbeat",
  jobAssigned: "worker-job-assigned",
  jobProgress: "worker-job-progress",
  logEmitted: "worker-log-emitted",
  jobCompleted: "worker-job-completed",
  metricsUpdated: "worker-metrics-updated",
  earningsUpdated: "worker-earnings-updated",
  error: "worker-error",
  machineDetected: "worker-machine-detected",
  machineRegistered: "worker-machine-registered",
  settingsUpdated: "worker-settings-updated",
  snapshot: "worker-snapshot"
} as const;

export type WorkerEventName = (typeof WORKER_EVENT_NAMES)[keyof typeof WORKER_EVENT_NAMES];

const eventNames = Object.values(WORKER_EVENT_NAMES);

function hasTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function listenToTauriWorkerEvents(onEvent: (event: WorkerEvent) => void): Promise<() => void> {
  if (!hasTauriRuntime()) {
    return () => undefined;
  }

  const { listen } = await import("@tauri-apps/api/event");
  const unlistenFns = await Promise.all(
    eventNames.map((eventName) =>
      listen<WorkerEvent>(eventName, (event) => {
        onEvent(event.payload);
      })
    )
  );

  return () => {
    for (const unlisten of unlistenFns) {
      unlisten();
    }
  };
}
