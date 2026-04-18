"use client";

import { Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { JobLog } from "@/src/types/worker";

const logTone: Record<JobLog["level"], string> = {
  info: "text-cyan-200",
  success: "text-emerald-200",
  warning: "text-amber-200",
  error: "text-rose-200"
};

export function ActivityLogPanel({ logs }: { logs: JobLog[] }) {
  return (
    <section className="rounded-lg border border-white/10 bg-[#0b0d0c]/90 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-emerald-200" />
          <h2 className="text-lg font-semibold text-white">Live activity</h2>
        </div>
        <span className="rounded-md border border-white/10 px-2 py-1 text-xs text-zinc-500">streaming</span>
      </div>
      <div className="mt-4 max-h-[360px] space-y-2 overflow-hidden font-mono text-xs">
        {logs.slice(0, 12).map((item) => (
          <div key={item.id} className="grid grid-cols-[72px_72px_1fr] gap-3 rounded-md border border-white/5 bg-white/[0.03] px-3 py-2">
            <span className="text-zinc-600">{new Date(item.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
            <span className={cn("uppercase", logTone[item.level])}>{item.level}</span>
            <span className="truncate text-zinc-300">{item.message}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
