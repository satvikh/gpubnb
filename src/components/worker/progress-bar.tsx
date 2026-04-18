"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-2 overflow-hidden rounded-md bg-white/10", className)}>
      <motion.div
        className="h-full rounded-md bg-gradient-to-r from-emerald-300 via-cyan-300 to-amber-200"
        animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        transition={{ duration: 0.55, ease: "easeOut" }}
      />
    </div>
  );
}
