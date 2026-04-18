"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { BarChart3, Gauge, HardDrive, LayoutDashboard, Settings, ShieldCheck, WalletCards } from "lucide-react";
import { cn } from "@/lib/utils";
import { TopStatusBar } from "@/src/components/worker/top-status-bar";
import { useWorker } from "@/src/hooks/use-worker";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobs", icon: HardDrive },
  { href: "/earnings", label: "Earnings", icon: WalletCards },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function AppShell({ children, title, eyebrow }: { children: React.ReactNode; title: string; eyebrow: string }) {
  const pathname = usePathname();
  const { state } = useWorker();

  return (
    <div className="min-h-screen bg-[#080a09] text-zinc-100">
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:44px_44px]" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_38%),linear-gradient(135deg,rgba(8,10,9,0.88),rgba(8,10,9,0.98)_62%,rgba(20,12,9,0.92))]" />
      <div className="relative flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-white/10 bg-black/25 p-5 backdrop-blur-xl lg:block">
          <Link href="/dashboard" className="group flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-300 text-zinc-950 shadow-[0_0_32px_rgba(110,231,183,0.22)]">
              <Gauge className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">ComputeBNB</p>
              <p className="text-xs text-zinc-500">Provider node</p>
            </div>
          </Link>

          <nav className="mt-8 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition",
                    active ? "bg-white text-zinc-950 shadow-[0_12px_32px_rgba(255,255,255,0.12)]" : "text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 rounded-lg border border-emerald-300/15 bg-emerald-300/10 p-4">
            <div className="flex items-center gap-2 text-emerald-100">
              <ShieldCheck className="h-4 w-4" />
              <p className="text-sm font-semibold">Trust controls on</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Workloads run in a restricted sandbox. Your files, keys, camera, and microphone stay off-limits.
            </p>
          </div>

          <div className="mt-8 rounded-lg border border-white/10 bg-white/[0.035] p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-400">Today</p>
              <BarChart3 className="h-4 w-4 text-cyan-200" />
            </div>
            <p className="mt-2 text-3xl font-semibold text-white">${state.earnings.today.toFixed(2)}</p>
            <p className="mt-1 text-xs text-zinc-500">{state.earnings.completedJobs} completed jobs lifetime</p>
          </div>
        </aside>

        <main className="w-full px-4 py-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1540px]">
            <header className="mb-5 flex flex-col gap-4">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200">{eyebrow}</p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h1>
                </div>
                <div className="rounded-md border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-zinc-300">
                  {state.machine.name}
                </div>
              </div>
              <TopStatusBar state={state} />
            </header>
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
              {children}
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}
