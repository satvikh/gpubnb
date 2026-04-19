"use client";

import { Cpu, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/src/components/worker/app-shell";
import { CpuLimitSlider } from "@/src/components/worker/cpu-limit-slider";
import { SettingToggleRow } from "@/src/components/worker/setting-toggle-row";
import { TrustSafetyCard } from "@/src/components/worker/trust-safety-card";
import { useWorker } from "@/src/hooks/use-worker";
import type { JobType } from "@/src/types/worker";

const jobTypes: Array<{ id: JobType; label: string }> = [
  { id: "render", label: "Rendering" },
  { id: "simulation", label: "Simulation" },
  { id: "batch-inference", label: "Batch inference" },
  { id: "compile", label: "Compilation" },
  { id: "data-cleaning", label: "Data cleaning" }
];

export default function ProviderSettingsPage() {
  const { state, dispatch } = useWorker();

  function toggleJobType(type: JobType) {
    const exists = state.settings.allowedJobTypes.includes(type);
    dispatch({
      type: "UPDATE_SETTINGS",
      settings: {
        allowedJobTypes: exists ? state.settings.allowedJobTypes.filter((item) => item !== type) : [...state.settings.allowedJobTypes, type]
      }
    });
  }

  return (
    <AppShell title="Settings and trust controls" eyebrow="Owner policy">
      <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <section className="rounded-lg border border-white/10 bg-white/[0.055] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
          <h2 className="text-xl font-semibold text-white">Availability</h2>
          <div className="mt-5 space-y-3">
            <SettingToggleRow title="Charging-only mode" description="Accept jobs only while connected to power." checked={state.settings.chargingOnly} onCheckedChange={(checked) => dispatch({ type: "UPDATE_SETTINGS", settings: { chargingOnly: checked } })} />
            <CpuLimitSlider value={state.settings.cpuLimit} onChange={(value) => dispatch({ type: "UPDATE_SETTINGS", settings: { cpuLimit: value } })} />
            <SettingToggleRow title="Auto-start worker" description="Start this provider node when ComputeBNB opens." checked={state.settings.autoStart} onCheckedChange={(checked) => dispatch({ type: "UPDATE_SETTINGS", settings: { autoStart: checked } })} />
            <SettingToggleRow title="Auto-accept jobs" description="Receive trusted jobs without manual approval." checked={state.settings.autoAcceptJobs} onCheckedChange={(checked) => dispatch({ type: "UPDATE_SETTINGS", settings: { autoAcceptJobs: checked } })} />
            <SettingToggleRow title="Allow background running" description="Keep earning while the command center is minimized." checked={state.settings.backgroundRunning} onCheckedChange={(checked) => dispatch({ type: "UPDATE_SETTINGS", settings: { backgroundRunning: checked } })} />
          </div>

          <div className="mt-5 rounded-lg border border-white/10 bg-black/20 p-4">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-cyan-200" />
              <p className="text-sm font-semibold text-white">Allowed job types</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {jobTypes.map((type) => {
                const active = state.settings.allowedJobTypes.includes(type.id);
                return (
                  <button
                    key={type.id}
                    className={`rounded-md border px-3 py-2 text-sm transition ${active ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100" : "border-white/10 bg-white/[0.04] text-zinc-400 hover:text-white"}`}
                    onClick={() => toggleJobType(type.id)}
                  >
                    {type.label}
                  </button>
                );
              })}
            </div>
          </div>

          <Button className="mt-5 h-12 w-full bg-rose-300 text-zinc-950 hover:bg-rose-200" onClick={() => dispatch({ type: "EMERGENCY_STOP" })}>
            <ShieldAlert className="mr-2 h-4 w-4" />
            Emergency stop and disconnect
          </Button>
        </section>

        <TrustSafetyCard />
      </div>
    </AppShell>
  );
}
