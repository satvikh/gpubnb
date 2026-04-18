"use client";

import { WorkerProvider } from "@/src/hooks/use-worker";

export function Providers({ children }: { children: React.ReactNode }) {
  return <WorkerProvider>{children}</WorkerProvider>;
}
