"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, BadgeDollarSign, LockKeyhole, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorker } from "@/src/hooks/use-worker";

export default function ProviderAuthPage() {
  const router = useRouter();
  const { signIn } = useWorker();

  function handleSignIn() {
    signIn("Satvikh");
    router.push("/provider/setup");
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#080a09] text-white">
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:44px_44px]" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_36%),linear-gradient(135deg,rgba(8,10,9,0.88),rgba(8,10,9,0.98)_60%,rgba(22,15,9,0.92))]" />
      <div className="relative grid min-h-screen items-center gap-10 px-5 py-10 lg:grid-cols-[1fr_520px] lg:px-12">
        <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }} className="mx-auto max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200">ComputeBNB provider</p>
          <h1 className="mt-5 max-w-3xl text-5xl font-semibold tracking-tight sm:text-7xl">
            Turn your idle laptop into an earning node.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
            Share spare CPU with vetted workloads, keep strict limits on power and privacy, and watch earnings land in real time.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <Value icon={Zap} title="Live jobs" copy="Auto-accept trusted compute when your machine is ready." />
            <Value icon={LockKeyhole} title="Local control" copy="Charging, CPU caps, and emergency stop stay one click away." />
            <Value icon={BadgeDollarSign} title="Payouts" copy="Track pending balance as jobs complete." />
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.55, delay: 0.1 }} className="mx-auto w-full max-w-[520px] rounded-lg border border-white/10 bg-white/[0.065] p-6 shadow-[0_32px_100px_rgba(0,0,0,0.42)] backdrop-blur-xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-emerald-300 text-zinc-950">
            <Sparkles className="h-6 w-6" />
          </div>
          <h2 className="mt-6 text-2xl font-semibold">Sign in to your provider account</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">This demo uses a local mock session so judges can move straight into machine registration.</p>
          <div className="mt-6 space-y-3">
            <label className="block text-sm font-medium text-zinc-300">Email</label>
            <input className="h-12 w-full border-white/10 bg-black/30 text-white placeholder:text-zinc-600" value="satvikh@computebnb.dev" readOnly />
            <label className="block text-sm font-medium text-zinc-300">Password</label>
            <input className="h-12 w-full border-white/10 bg-black/30 text-white placeholder:text-zinc-600" value="demo-provider-key" readOnly type="password" />
          </div>
          <Button className="mt-6 h-12 w-full bg-emerald-300 text-zinc-950 hover:bg-emerald-200" onClick={handleSignIn}>
            Sign in and detect machine
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <p className="mt-4 text-center text-xs text-zinc-500">Workloads never receive access to your personal files or keys.</p>
        </motion.section>
      </div>
    </main>
  );
}

function Value({ icon: Icon, title, copy }: { icon: typeof Zap; title: string; copy: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
      <Icon className="h-5 w-5 text-emerald-200" />
      <p className="mt-4 font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-zinc-500">{copy}</p>
    </div>
  );
}
