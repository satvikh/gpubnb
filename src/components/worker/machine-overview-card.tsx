"use client";

import { Cpu, HardDrive, Laptop, Power, ServerCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/src/lib/format";
import { StatusBadge } from "@/src/components/worker/status-badge";
import type { WorkerState } from "@/src/types/worker";

export function MachineOverviewCard({
  state,
  onStart,
  onStop,
  onPause
}: {
  state: WorkerState;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
}) {
  const running = state.machine.status !== "offline";

  return (
    <section className="relative overflow-hidden rounded-lg border border-white/10 bg-white/[0.055] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.32)]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-200/60 to-transparent" />
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-white text-zinc-950">
              <Laptop className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">Registered machine</p>
              <h2 className="text-2xl font-semibold text-white">{state.machine.name}</h2>
            </div>
            <StatusBadge status={state.machine.status} />
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Spec icon={Cpu} label="CPU" value={state.machine.cpu} />
            <Spec icon={HardDrive} label="Memory" value={`${state.machine.memoryGb} GB unified`} />
            <Spec icon={ServerCog} label="Uptime" value={formatDuration(state.machine.uptimeSeconds)} />
          </div>
        </div>

        <div className="w-full rounded-lg border border-white/10 bg-black/25 p-4 md:w-72">
          <p className="text-sm font-medium text-zinc-300">Worker control</p>
          <p className="mt-1 text-sm leading-6 text-zinc-500">
            {running ? "Your node is accepting trusted jobs inside your resource limits." : "Start the worker to receive a demo job from the scheduler."}
          </p>
          <div className="mt-4 flex gap-2">
            {running ? (
              <>
                <Button variant="outline" className="h-11 flex-1 border-white/15 bg-white/[0.03] text-white hover:bg-white/10" onClick={onPause}>
                  Pause
                </Button>
                <Button className="h-11 flex-1 bg-rose-300 text-zinc-950 hover:bg-rose-200" onClick={onStop}>
                  Stop
                </Button>
              </>
            ) : (
              <Button className="h-11 w-full bg-emerald-300 text-zinc-950 hover:bg-emerald-200" onClick={onStart}>
                <Power className="mr-2 h-4 w-4" />
                Start Worker
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Spec({ icon: Icon, label, value }: { icon: typeof Cpu; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-2 text-sm font-medium text-zinc-100">{value}</p>
    </div>
  );
}
