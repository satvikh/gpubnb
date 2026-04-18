"use client";

import * as React from "react";
import { createInitialWorkerState, reduceWorkerState } from "@/src/lib/worker-runtime";
import type { WorkerAction, WorkerSettings, WorkerState } from "@/src/types/worker";

interface WorkerContextValue {
  state: WorkerState;
  dispatch: React.Dispatch<WorkerAction>;
  signIn: (name?: string) => void;
  registerMachine: (settings?: Partial<WorkerSettings>) => void;
  startWorker: () => void;
  stopWorker: () => void;
  pauseWorker: () => void;
  resumeWorker: () => void;
}

const WorkerContext = React.createContext<WorkerContextValue | null>(null);

function workerReducer(state: WorkerState, action: WorkerAction) {
  return reduceWorkerState(state, action);
}

export function WorkerProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(workerReducer, undefined, createInitialWorkerState);

  React.useEffect(() => {
    const id = window.setInterval(() => dispatch({ type: "TICK" }), 1900);
    return () => window.clearInterval(id);
  }, []);

  const value = React.useMemo<WorkerContextValue>(
    () => ({
      state,
      dispatch,
      signIn: (name = "Satvikh") => dispatch({ type: "SIGN_IN", name }),
      registerMachine: (settings = {}) => dispatch({ type: "REGISTER_MACHINE", settings }),
      startWorker: () => dispatch({ type: "START_WORKER" }),
      stopWorker: () => dispatch({ type: "STOP_WORKER" }),
      pauseWorker: () => dispatch({ type: "PAUSE_WORKER" }),
      resumeWorker: () => dispatch({ type: "RESUME_WORKER" })
    }),
    [state]
  );

  return <WorkerContext.Provider value={value}>{children}</WorkerContext.Provider>;
}

export function useWorker() {
  const context = React.useContext(WorkerContext);
  if (!context) {
    throw new Error("useWorker must be used inside WorkerProvider");
  }
  return context;
}
