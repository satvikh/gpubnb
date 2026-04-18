"use client";

import * as React from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";
import { ArrowUpRight, WalletCards } from "lucide-react";
import { formatCurrency } from "@/src/lib/format";
import type { Earnings } from "@/src/types/worker";

export function EarningsCard({ earnings }: { earnings: Earnings }) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.055] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-200">Earnings</p>
          <p className="mt-3 text-4xl font-semibold text-white">{formatCurrency(earnings.lifetime)}</p>
          <p className="mt-1 text-sm text-zinc-500">Lifetime provider revenue</p>
        </div>
        <div className="rounded-md border border-amber-200/20 bg-amber-200/10 p-2 text-amber-100">
          <WalletCards className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-5 h-32 min-h-32">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={earnings.history} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="earningsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fde68a" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#fde68a" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <Tooltip contentStyle={{ background: "#101210", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#fff" }} />
              <Area type="monotone" dataKey="amount" stroke="#fde68a" strokeWidth={2} fill="url(#earningsFill)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full rounded-lg border border-white/10 bg-white/[0.035]" />
        )}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        <MiniStat label="Today" value={formatCurrency(earnings.today)} />
        <MiniStat label="Pending" value={formatCurrency(earnings.pending)} />
        <MiniStat label="Jobs" value={String(earnings.completedJobs)} />
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-md border border-emerald-300/15 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100">
        <ArrowUpRight className="h-4 w-4" />
        Next payout clears after verification.
      </div>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/20 p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
