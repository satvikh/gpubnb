"use client";

import { FileLock2, KeyRound, ShieldAlert, ShieldCheck } from "lucide-react";

const items = [
  { icon: ShieldCheck, title: "Sandboxed execution", copy: "Jobs run in a restricted runtime with no access to personal folders." },
  { icon: FileLock2, title: "Encrypted bundles", copy: "Workload payloads are verified before execution and sealed after completion." },
  { icon: KeyRound, title: "Local credentials", copy: "Provider keys stay on this machine and can be revoked from settings." },
  { icon: ShieldAlert, title: "Emergency stop", copy: "Disconnect instantly if thermals, battery, or network behavior looks wrong." }
];

export function TrustSafetyCard() {
  return (
    <section className="rounded-lg border border-emerald-300/15 bg-emerald-300/10 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.2)]">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-100">Trust and safety</p>
      <h2 className="mt-2 text-xl font-semibold text-white">You stay in control</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="rounded-lg border border-white/10 bg-black/20 p-4">
              <Icon className="h-4 w-4 text-emerald-100" />
              <p className="mt-3 text-sm font-semibold text-white">{item.title}</p>
              <p className="mt-1 text-sm leading-6 text-zinc-400">{item.copy}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
