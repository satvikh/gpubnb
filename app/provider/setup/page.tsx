"use client";

import { useRouter } from "next/navigation";
import { useWorker } from "@/src/hooks/use-worker";

export default function ProviderSetupPage() {
  const router = useRouter();
  const { state, dispatch, registerMachine } = useWorker();

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-4xl rounded-xl border border-white/10 bg-white/5 p-8">
        <p className="text-sm uppercase tracking-[0.2em] text-zinc-400">Producer machine setup</p>
        <h1 className="mt-4 text-4xl font-semibold">Configure this machine for Python jobs</h1>
        <div className="mt-8 grid gap-4">
          <input
            className="h-12 rounded-md border border-white/10 bg-black/30 px-4 text-white"
            value={state.machine.name}
            onChange={(event) =>
              dispatch({
                type: "WORKER_EVENT",
                event: {
                  type: "machine_detected",
                  machine: { ...state.machine, name: event.target.value },
                },
              })
            }
          />
          <input
            className="h-12 rounded-md border border-white/10 bg-black/30 px-4 text-white"
            value={state.machine.cpu}
            onChange={(event) =>
              dispatch({
                type: "WORKER_EVENT",
                event: {
                  type: "machine_detected",
                  machine: { ...state.machine, cpu: event.target.value },
                },
              })
            }
          />
          <input
            className="h-12 rounded-md border border-white/10 bg-black/30 px-4 text-white"
            value={(state.machine as { gpu?: string }).gpu ?? ""}
            onChange={(event) =>
              dispatch({
                type: "WORKER_EVENT",
                event: {
                  type: "machine_detected",
                  machine: { ...state.machine, gpu: event.target.value } as typeof state.machine,
                },
              })
            }
            placeholder="GPU label"
          />
          <input
            type="number"
            min={1}
            className="h-12 rounded-md border border-white/10 bg-black/30 px-4 text-white"
            value={state.machine.memoryGb}
            onChange={(event) =>
              dispatch({
                type: "WORKER_EVENT",
                event: {
                  type: "machine_detected",
                  machine: {
                    ...state.machine,
                    memoryGb: Number(event.target.value),
                  },
                },
              })
            }
          />
          <button
            className="h-12 rounded-md bg-lime-300 font-medium text-zinc-950"
            onClick={() => {
              registerMachine(state.settings);
              router.push("/provider/dashboard");
            }}
          >
            Save machine details
          </button>
        </div>
      </div>
    </main>
  );
}
