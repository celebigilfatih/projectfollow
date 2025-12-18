"use client";
import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { twMerge } from "tailwind-merge";

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;
export function TooltipContent({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <TooltipPrimitive.Content sideOffset={6} className={twMerge("z-50 rounded-md border border-[var(--border)] bg-white px-2 py-1 text-xs shadow-md", className)}>
      {children}
    </TooltipPrimitive.Content>
  );
}
