"use client";
import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { twMerge } from "tailwind-merge";

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuPortal = DropdownMenuPrimitive.Portal;
export const DropdownMenuContent = ({ className, children }: { className?: string; children: React.ReactNode }) => {
  return (
    <DropdownMenuPrimitive.Content className={twMerge("z-50 min-w-[10rem] rounded-md border border-[var(--border)] bg-white p-1 shadow-md", className)}>
      {children}
    </DropdownMenuPrimitive.Content>
  );
}
export function DropdownMenuItem({ className, children, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Item>) {
  return (
    <DropdownMenuPrimitive.Item {...props} className={twMerge("flex cursor-pointer select-none items-center rounded px-2 py-1.5 text-sm outline-none hover:bg-neutral-100", className)}>
      {children}
    </DropdownMenuPrimitive.Item>
  );
}
