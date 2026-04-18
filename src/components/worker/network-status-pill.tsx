"use client";

import { Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

export function NetworkStatusPill({ online, latency }: { online: boolean; latency: number }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium",
        online ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100" : "border-rose-300/30 bg-rose-400/10 text-rose-100"
      )}
    >
      <Wifi className="h-3.5 w-3.5" />
      {online ? `Connected ${latency ? `${latency}ms` : ""}` : "Disconnected"}
    </div>
  );
}
