"use client";

import { useRouter } from "next/navigation";
import { Cpu, HardDrive, Laptop, MonitorCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CpuLimitSlider } from "@/src/components/worker/cpu-limit-slider";
import { SettingToggleRow } from "@/src/components/worker/setting-toggle-row";
import { useWorker } from "@/src/hooks/use-worker";

export default function SetupPage() {
  const router = useRouter();
  const { state, dispatch, registerMachine } = useWorker();

  return (
    <main className="min-h-screen bg-[#080a09] px-5 py-8 text-white">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_36%),linear-gradient(135deg,#080a09,#080a09_65%,#160f09)]" />
      <div className="relative mx-auto max-w-6xl">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200">First-run setup</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Register this machine</h1>
        <p className="mt-3 max-w-2xl text-zinc-400">ComputeBNB detected your local specs. Choose exactly when this node can contribute compute.</p>

        <div className="mt-8 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-lg border border-white/10 bg-white/[0.055] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-white text-zinc-950">
                <Laptop className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-zinc-500">Detected node</p>
                <h2 className="text-2xl font-semibold">{state.machine.name}</h2>
              </div>
            </div>
            <div className="mt-6 grid gap-3">
              <Spec icon={MonitorCog} label="Operating system" value={state.machine.os} />
              <Spec icon={Cpu} label="Processor" value={state.machine.cpu} />
              <Spec icon={HardDrive} label="Memory" value={`${state.machine.memoryGb} GB`} />
            </div>
          </section>

          <section className="rounded-lg border border-white/10 bg-white/[0.055] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
            <h2 className="text-xl font-semibold">Worker preferences</h2>
            <div className="mt-5 space-y-3">
              <SettingToggleRow title="Available when charging only" description="Pause new jobs if the laptop is unplugged." checked={state.settings.chargingOnly} onCheckedChange={(checked) => dispatch({ type: "UPDATE_SETTINGS", settings: { chargingOnly: checked } })} />
              <CpuLimitSlider value={state.settings.cpuLimit} onChange={(value) => dispatch({ type: "UPDATE_SETTINGS", settings: { cpuLimit: value } })} />
              <SettingToggleRow title="Allow background running" description="Keep the worker available while this app is minimized." checked={state.settings.backgroundRunning} onCheckedChange={(checked) => dispatch({ type: "UPDATE_SETTINGS", settings: { backgroundRunning: checked } })} />
              <SettingToggleRow title="Auto-accept trusted jobs" description="Let the scheduler assign vetted jobs without a manual prompt." checked={state.settings.autoAcceptJobs} onCheckedChange={(checked) => dispatch({ type: "UPDATE_SETTINGS", settings: { autoAcceptJobs: checked } })} />
            </div>
            <Button
              className="mt-6 h-12 w-full bg-emerald-300 text-zinc-950 hover:bg-emerald-200"
              onClick={() => {
                registerMachine(state.settings);
                router.push("/dashboard");
              }}
            >
              Register machine and open dashboard
            </Button>
          </section>
        </div>
      </div>
    </main>
  );
}

function Spec({ icon: Icon, label, value }: { icon: typeof Cpu; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
