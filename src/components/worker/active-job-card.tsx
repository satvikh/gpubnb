"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Box, CircleDollarSign, Clock, Cpu, PauseCircle, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { estimateRemaining, formatCurrency, formatDuration } from "@/src/lib/format";
import { ProgressBar } from "@/src/components/worker/progress-bar";
import type { Job, WorkerStatus } from "@/src/types/worker";

export function ActiveJobCard({
  job,
  workerStatus,
  onPause,
  onResume
}: {
  job: Job | null;
  workerStatus: WorkerStatus;
  onPause: () => void;
  onResume: () => void;
}) {
  const elapsed = job?.startedAt ? Math.floor((Date.now() - new Date(job.startedAt).getTime()) / 1000) : 0;

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.055] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">Active workload</p>
          <h2 className="mt-2 text-xl font-semibold text-white">{job ? job.name : "Waiting for trusted compute job"}</h2>
        </div>
        <Button
          variant="outline"
          className="border-white/15 bg-white/[0.03] text-white hover:bg-white/10"
          onClick={workerStatus === "paused" ? onResume : onPause}
          disabled={!job}
        >
          {workerStatus === "paused" ? <PlayCircle className="mr-2 h-4 w-4" /> : <PauseCircle className="mr-2 h-4 w-4" />}
          {workerStatus === "paused" ? "Resume" : "Pause"}
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {job ? (
          <motion.div key={job.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="mt-5">
            <div className="grid gap-3 sm:grid-cols-4">
              <JobMetric icon={Box} label="Type" value={job.type.replace("-", " ")} />
              <JobMetric icon={Clock} label="Elapsed" value={formatDuration(elapsed)} />
              <JobMetric icon={Cpu} label="Load" value={`${job.cpuUsage.toFixed(0)}% CPU`} />
              <JobMetric icon={CircleDollarSign} label="Earning" value={formatCurrency(job.earnings)} />
            </div>
            <div className="mt-5 rounded-lg border border-white/10 bg-black/25 p-4">
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="font-medium text-white">{job.progress.toFixed(0)}% complete</span>
                <span className="text-zinc-400">{estimateRemaining(job.progress, job.startedAt)} remaining</span>
              </div>
              <ProgressBar value={job.progress} />
            </div>
          </motion.div>
        ) : (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-5 rounded-lg border border-dashed border-white/15 bg-black/20 p-8 text-center">
            <p className="text-sm font-medium text-zinc-200">The scheduler will assign a job moments after the worker comes online.</p>
            <p className="mt-2 text-sm text-zinc-500">Auto-accept is enabled, CPU limits are enforced, and every workload is logged here.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function JobMetric({ icon: Icon, label, value }: { icon: typeof Box; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-2 text-sm font-semibold capitalize text-white">{value}</p>
    </div>
  );
}
