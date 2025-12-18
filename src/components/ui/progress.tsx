"use client";
import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { twMerge } from "tailwind-merge";

export function Progress({ value, className, barClassName }: { value?: number; className?: string; barClassName?: string }) {
  const v = Math.max(0, Math.min(100, value ?? 0));
  return (
    <ProgressPrimitive.Root className={twMerge("relative h-2 w-full overflow-hidden rounded bg-neutral-100", className)} value={v}>
      <ProgressPrimitive.Indicator className={twMerge("h-2 w-full rounded bg-[var(--primary)] transition-transform duration-300 ease-out", barClassName)} style={{ transform: `translateX(-${100 - v}%)` }} />
    </ProgressPrimitive.Root>
  );
}
