"use client";

import { CheckCircle2 } from "lucide-react";
import { formatCurrency, formatTimeAgo } from "@/src/lib/format";
import type { Job } from "@/src/types/worker";

export function RecentJobsTable({ jobs }: { jobs: Job[] }) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.055] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.2)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">History</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Recent jobs</h2>
        </div>
        <span className="rounded-md border border-white/10 px-2 py-1 text-xs text-zinc-400">{jobs.length} synced</span>
      </div>
      <div className="mt-4 overflow-hidden rounded-lg border border-white/10">
        {jobs.slice(0, 5).map((job) => (
          <div key={job.id} className="grid grid-cols-[1fr_auto] gap-3 border-b border-white/10 bg-black/15 p-3 last:border-b-0 sm:grid-cols-[1fr_130px_90px_96px]">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{job.name}</p>
              <p className="mt-1 text-xs capitalize text-zinc-500">{job.type.replace("-", " ")}</p>
            </div>
            <div className="hidden text-sm text-zinc-400 sm:block">{formatTimeAgo(job.startedAt)}</div>
            <div className="hidden items-center gap-1.5 text-sm text-emerald-200 sm:flex">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {job.status}
            </div>
            <div className="text-right text-sm font-semibold text-white">{formatCurrency(job.earnings)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
