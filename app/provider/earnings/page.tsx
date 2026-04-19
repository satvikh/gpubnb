"use client";

import { CheckCircle2, Clock4, Landmark, WalletCards } from "lucide-react";
import { AppShell } from "@/src/components/worker/app-shell";
import { EarningsCard } from "@/src/components/worker/earnings-card";
import { MetricTile } from "@/src/components/worker/metric-tile";
import { RecentJobsTable } from "@/src/components/worker/recent-jobs-table";
import { useWorker } from "@/src/hooks/use-worker";
import { formatCurrency } from "@/src/lib/format";

export default function ProviderEarningsPage() {
  const { state } = useWorker();
  return (
    <AppShell title="Earnings and payouts" eyebrow="Provider ledger">
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-5">
          <EarningsCard earnings={state.earnings} />
          <section className="rounded-lg border border-white/10 bg-white/[0.055] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-200">Payout status</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Next payout</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <MetricTile icon={WalletCards} label="Pending" value={formatCurrency(state.earnings.pending)} detail="Clears after result verification" tone="warm" />
              <MetricTile icon={Landmark} label="Destination" value="Bank linked" detail="Provider payout profile ready" />
              <MetricTile icon={Clock4} label="Window" value="24h" detail="Estimated settlement time" tone="cool" />
              <MetricTile icon={CheckCircle2} label="Compliance" value="Ready" detail="Tax profile verified" />
            </div>
          </section>
        </div>
        <RecentJobsTable jobs={state.recentJobs} />
      </div>
    </AppShell>
  );
}
