"use client";

import { BatteryCharging, Cpu, HardDrive, RadioTower, Thermometer, Wifi } from "lucide-react";
import { MetricTile } from "@/src/components/worker/metric-tile";
import type { WorkerState } from "@/src/types/worker";

export function ResourceUsageCard({ state }: { state: WorkerState }) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.055] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.2)]">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200">Machine health</p>
        <h2 className="mt-2 text-xl font-semibold text-white">Resource envelope</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <MetricTile icon={Cpu} label="CPU" value={`${state.metrics.cpuUsage.toFixed(0)}%`} detail={`${state.machine.cpuLimit}% owner cap`} progress={state.metrics.cpuUsage} />
        <MetricTile icon={HardDrive} label="Memory" value={`${state.metrics.memoryUsage.toFixed(0)}%`} detail={`${state.machine.memoryGb} GB detected`} progress={state.metrics.memoryUsage} tone="cool" />
        <MetricTile icon={BatteryCharging} label="Battery" value={`${state.metrics.batteryPercent.toFixed(0)}%`} detail={state.machine.charging ? "Charging-only rule satisfied" : "Running on battery"} progress={state.metrics.batteryPercent} />
        <MetricTile icon={Thermometer} label="Thermals" value={`${state.metrics.temperatureC.toFixed(0)} C`} detail="Mock sensor, healthy range" progress={(state.metrics.temperatureC / 90) * 100} tone="warm" />
        <MetricTile icon={Wifi} label="Network" value={`${state.metrics.networkMbps.toFixed(0)} Mbps`} detail="Relay bandwidth available" progress={Math.min(100, state.metrics.networkMbps / 2)} tone="cool" />
        <MetricTile icon={RadioTower} label="Heartbeat" value={`${state.metrics.heartbeatLatencyMs || 0}ms`} detail="Scheduler control plane" progress={state.metrics.heartbeatLatencyMs ? 100 - state.metrics.heartbeatLatencyMs : 0} />
      </div>
    </section>
  );
}
