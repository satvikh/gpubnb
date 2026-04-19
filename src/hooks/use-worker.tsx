"use client";

import * as React from "react";
import { workerClient } from "@/src/lib/worker-client";
import { createInitialWorkerState, reduceWorkerState } from "@/src/lib/worker-runtime";
import type { WorkerAction, WorkerRuntimeSnapshot, WorkerSettings, WorkerState } from "@/src/types/worker";

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
  const [state, baseDispatch] = React.useReducer(workerReducer, undefined, createInitialWorkerState);
  const stateRef = React.useRef(state);

  React.useEffect(() => {
    stateRef.current = state;
  }, [state]);

  React.useEffect(() => {
    let active = true;
    let unlisten: (() => void) | null = null;
    let intervalId: number | null = null;

    async function connectWorkerClient() {
      unlisten = await workerClient.subscribeToWorkerEvents((event) => {
        if (active) {
          baseDispatch({ type: "WORKER_EVENT", event });
        }
      });

      const detected = await workerClient.detectMachine();
      if (active && detected) {
        baseDispatch({ type: "WORKER_SNAPSHOT", snapshot: detected });
      }

      const snapshot = await workerClient.getWorkerStatus();
      if (active && snapshot) {
        baseDispatch({ type: "WORKER_SNAPSHOT", snapshot });
      }

      intervalId = window.setInterval(async () => {
        try {
          const liveSnapshot = await workerClient.getWorkerStatus();
          if (active && liveSnapshot) {
            baseDispatch({ type: "WORKER_SNAPSHOT", snapshot: liveSnapshot });
          }
        } catch (error) {
          if (active) {
            baseDispatch({
              type: "WORKER_EVENT",
              event: {
                type: "worker_error",
                message: error instanceof Error ? error.message : "Worker status refresh failed.",
                recoverable: true
              }
            });
          }
        }
      }, 2000);
    }

    connectWorkerClient().catch((error) => {
      baseDispatch({
        type: "WORKER_EVENT",
        event: {
          type: "worker_error",
          message: error instanceof Error ? error.message : "Worker client failed to initialize.",
          recoverable: true
        }
      });
    });

    return () => {
      active = false;
      unlisten?.();
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, []);

  const dispatch = React.useCallback<React.Dispatch<WorkerAction>>((action) => {
    baseDispatch(action);

    async function applySnapshot(promise: Promise<WorkerRuntimeSnapshot | null>) {
      const snapshot = await promise;
      if (snapshot) {
        baseDispatch({ type: "WORKER_SNAPSHOT", snapshot });
      }
    }

    if (action.type === "UPDATE_SETTINGS") {
      const settings = { ...stateRef.current.settings, ...action.settings };
      applySnapshot(workerClient.updateWorkerSettings(settings)).catch((error) => {
        baseDispatch({
          type: "WORKER_EVENT",
          event: {
            type: "worker_error",
            message: error instanceof Error ? error.message : "Unable to update worker settings.",
            recoverable: true
          }
        });
      });
    }

    if (action.type === "EMERGENCY_STOP") {
      applySnapshot(workerClient.emergencyStop()).catch((error) => {
        baseDispatch({
          type: "WORKER_EVENT",
          event: {
            type: "worker_error",
            message: error instanceof Error ? error.message : "Emergency stop failed.",
            recoverable: false
          }
        });
      });
    }
  }, []);

  const applySnapshot = React.useCallback(async (promise: Promise<WorkerRuntimeSnapshot | null>) => {
    const snapshot = await promise;
    if (snapshot) {
      baseDispatch({ type: "WORKER_SNAPSHOT", snapshot });
    }
  }, []);

  const value = React.useMemo<WorkerContextValue>(
    () => ({
      state,
      dispatch,
      signIn: (name = "Satvikh") => dispatch({ type: "SIGN_IN", name }),
      registerMachine: (settings = {}) => {
        const nextSettings = { ...state.settings, ...settings };
        applySnapshot(workerClient.registerMachine(nextSettings, stateRef.current.machine)).catch((error) => {
          baseDispatch({
            type: "WORKER_EVENT",
            event: {
              type: "worker_error",
              message: error instanceof Error ? error.message : "Machine registration failed.",
              recoverable: true
            }
          });
        });
      },
      startWorker: () => {
        applySnapshot(workerClient.startWorker()).catch((error) => {
          baseDispatch({
            type: "WORKER_EVENT",
            event: {
              type: "worker_error",
              message: error instanceof Error ? error.message : "Worker failed to start.",
              recoverable: true
            }
          });
        });
      },
      stopWorker: () => {
        applySnapshot(workerClient.stopWorker()).catch((error) => {
          baseDispatch({
            type: "WORKER_EVENT",
            event: {
              type: "worker_error",
              message: error instanceof Error ? error.message : "Worker failed to stop.",
              recoverable: true
            }
          });
        });
      },
      pauseWorker: () => {
        applySnapshot(workerClient.pauseWorker()).catch((error) => {
          baseDispatch({
            type: "WORKER_EVENT",
            event: {
              type: "worker_error",
              message: error instanceof Error ? error.message : "Worker failed to pause.",
              recoverable: true
            }
          });
        });
      },
      resumeWorker: () => {
        applySnapshot(workerClient.resumeWorker()).catch((error) => {
          baseDispatch({
            type: "WORKER_EVENT",
            event: {
              type: "worker_error",
              message: error instanceof Error ? error.message : "Worker failed to resume.",
              recoverable: true
            }
          });
        });
      }
    }),
    [applySnapshot, dispatch, state]
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
