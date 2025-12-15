"use client";
import * as React from "react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { twMerge } from "tailwind-merge";

export const Dialog = ({ open, onOpenChange, children, contentClassName }: { open: boolean; onOpenChange: (v: boolean) => void; children: React.ReactNode; contentClassName?: string }) => (
  <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-50 bg-neutral-700/40" />
      <RadixDialog.Content className={twMerge("fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2", contentClassName)}>
        {children}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  </RadixDialog.Root>
);

export function DialogContent({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={twMerge("rounded-md border bg-white p-4 shadow-xl", className)}>{children}</div>;
}

export function DialogHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={twMerge("mb-3 flex items-center justify-between", className)}>{children}</div>;
}

export function DialogTitle({ className, children }: { className?: string; children: React.ReactNode }) {
  return <h2 className={twMerge("text-base font-semibold", className)}>{children}</h2>;
}
