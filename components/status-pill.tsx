import { cn } from "@/lib/utils";
import type { JobStatus, ProviderStatus } from "@/lib/types";

const styles: Record<JobStatus | ProviderStatus, string> = {
  queued: "bg-zinc-100 text-zinc-700",
  assigned: "bg-sky-100 text-sky-800",
  running: "bg-amber-100 text-amber-800",
  completed: "bg-emerald-100 text-emerald-800",
  failed: "bg-rose-100 text-rose-800",
  online: "bg-emerald-100 text-emerald-800",
  offline: "bg-zinc-100 text-zinc-700",
  busy: "bg-amber-100 text-amber-800"
};

export function StatusPill({ status }: { status: JobStatus | ProviderStatus }) {
  return (
    <span className={cn("inline-flex rounded-sm px-2 py-1 text-xs font-medium", styles[status])}>
      {status}
    </span>
  );
}
