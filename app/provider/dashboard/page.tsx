"use client";

import { ActivityLogPanel } from "@/src/components/worker/activity-log-panel";
import { ActiveJobCard } from "@/src/components/worker/active-job-card";
import { AppShell } from "@/src/components/worker/app-shell";
import { EarningsCard } from "@/src/components/worker/earnings-card";
import { MachineOverviewCard } from "@/src/components/worker/machine-overview-card";
import { RecentJobsTable } from "@/src/components/worker/recent-jobs-table";
import { ResourceUsageCard } from "@/src/components/worker/resource-usage-card";
import { TrustSafetyCard } from "@/src/components/worker/trust-safety-card";
import { useWorker } from "@/src/hooks/use-worker";

export default function ProviderDashboardPage() {
  const { state, startWorker, stopWorker, pauseWorker, resumeWorker } = useWorker();
  const logs = [...(state.activeJob?.logs ?? []), ...state.workerLogs];

  return (
    <AppShell title="Provider command center" eyebrow="Machine dashboard">
      <div className="grid gap-5 xl:grid-cols-[1.45fr_0.85fr]">
        <div className="space-y-5">
          <MachineOverviewCard state={state} onStart={startWorker} onStop={stopWorker} onPause={pauseWorker} />
          <ActiveJobCard job={state.activeJob} workerStatus={state.machine.status} onPause={pauseWorker} onResume={resumeWorker} />
          <ResourceUsageCard state={state} />
          <RecentJobsTable jobs={state.recentJobs} />
        </div>
        <div className="space-y-5">
          <EarningsCard earnings={state.earnings} />
          <ActivityLogPanel logs={logs} />
          <TrustSafetyCard />
        </div>
      </div>
    </AppShell>
  );
}
