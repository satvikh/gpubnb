"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProgressBar } from "@/src/components/worker/progress-bar";

export function MetricTile({
  icon: Icon,
  label,
  value,
  detail,
  progress,
  tone = "default"
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  progress?: number;
  tone?: "default" | "warm" | "cool" | "danger";
}) {
  const tones = {
    default: "text-emerald-100 bg-emerald-300/10 border-emerald-300/15",
    warm: "text-amber-100 bg-amber-300/10 border-amber-300/15",
    cool: "text-cyan-100 bg-cyan-300/10 border-cyan-300/15",
    danger: "text-rose-100 bg-rose-300/10 border-rose-300/15"
  };

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.045] p-4 shadow-[0_18px_42px_rgba(0,0,0,0.18)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
        </div>
        <div className={cn("rounded-md border p-2", tones[tone])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 text-sm text-zinc-400">{detail}</p>
      {typeof progress === "number" ? <ProgressBar value={progress} className="mt-4 h-1.5" /> : null}
    </div>
  );
}
