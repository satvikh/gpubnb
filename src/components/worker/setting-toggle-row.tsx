"use client";

import * as Switch from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export function SettingToggleRow({
  title,
  description,
  checked,
  onCheckedChange
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-1 text-sm text-zinc-500">{description}</p>
      </div>
      <Switch.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        className={cn("relative h-6 w-11 rounded-md border border-white/10 transition", checked ? "bg-emerald-300" : "bg-zinc-800")}
      >
        <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded bg-white shadow transition data-[state=checked]:translate-x-5" />
      </Switch.Root>
    </div>
  );
}
