"use client";

import * as Slider from "@radix-ui/react-slider";

export function CpuLimitSlider({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">CPU usage cap</p>
          <p className="mt-1 text-sm text-zinc-500">ComputeBNB will stay under this owner-defined limit.</p>
        </div>
        <span className="rounded-md border border-emerald-300/20 bg-emerald-300/10 px-2 py-1 text-sm font-semibold text-emerald-100">{value}%</span>
      </div>
      <Slider.Root value={[value]} min={20} max={90} step={1} onValueChange={([next]) => onChange(next)} className="relative mt-5 flex h-5 touch-none select-none items-center">
        <Slider.Track className="relative h-2 grow overflow-hidden rounded-md bg-white/10">
          <Slider.Range className="absolute h-full rounded-md bg-gradient-to-r from-emerald-300 to-amber-200" />
        </Slider.Track>
        <Slider.Thumb className="block h-5 w-5 rounded-md border border-white/40 bg-white shadow focus:outline-none focus:ring-2 focus:ring-emerald-200" />
      </Slider.Root>
    </div>
  );
}
