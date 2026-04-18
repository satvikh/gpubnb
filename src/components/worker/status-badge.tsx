"use client";

import { cn } from "@/lib/utils";
import type { WorkerStatus } from "@/src/types/worker";

const statusStyles: Record<WorkerStatus, string> = {
  offline: "border-zinc-700 bg-zinc-900 text-zinc-300",
  online: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  idle: "border-cyan-400/30 bg-cyan-400/10 text-cyan-100",
  busy: "border-amber-300/30 bg-amber-300/10 text-amber-100",
  paused: "border-fuchsia-300/30 bg-fuchsia-300/10 text-fuchsia-100",
  error: "border-rose-400/30 bg-rose-400/10 text-rose-100"
};

export function StatusBadge({ status, className }: { status: WorkerStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
        statusStyles[status],
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", status === "offline" ? "bg-zinc-400" : "bg-current")} />
      {status}
    </span>
  );
}
