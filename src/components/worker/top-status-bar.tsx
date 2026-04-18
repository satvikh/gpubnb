"use client";

import { Activity, BatteryCharging, Clock3, ShieldCheck } from "lucide-react";
import { formatTimeAgo } from "@/src/lib/format";
import { NetworkStatusPill } from "@/src/components/worker/network-status-pill";
import { StatusBadge } from "@/src/components/worker/status-badge";
import type { WorkerState } from "@/src/types/worker";

export function TopStatusBar({ state }: { state: WorkerState }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/25 px-4 py-3 shadow-[0_18px_55px_rgba(0,0,0,0.22)] backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={state.machine.status} />
        <NetworkStatusPill online={state.networkOnline} latency={state.metrics.heartbeatLatencyMs} />
        <span className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-300">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-200" />
          Isolated workloads
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400">
        <span className="inline-flex items-center gap-1.5">
          <Clock3 className="h-3.5 w-3.5 text-zinc-500" />
          Heartbeat {formatTimeAgo(state.machine.lastHeartbeatAt)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <BatteryCharging className="h-3.5 w-3.5 text-emerald-200" />
          {state.metrics.batteryPercent.toFixed(0)}% charging
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-cyan-200" />
          {state.activeJob ? "Job streaming" : "Scheduler ready"}
        </span>
      </div>
    </div>
  );
}
