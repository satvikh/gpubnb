import type { Machine, WorkerSettings } from "@/src/types/worker";

export interface NativeWorkerAdapter {
  detectMachine: () => Promise<Machine | null>;
  registerMachine: (settings: WorkerSettings) => Promise<{ machineId: string }>;
  startWorker: () => Promise<void>;
  stopWorker: () => Promise<void>;
}

export const tauriWorkerAdapter: NativeWorkerAdapter = {
  async detectMachine() {
    return null;
  },
  async registerMachine(settings) {
    void settings;
    return { machineId: "mock-native-node" };
  },
  async startWorker() {
    return undefined;
  },
  async stopWorker() {
    return undefined;
  }
};
