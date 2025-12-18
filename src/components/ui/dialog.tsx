"use client";
import * as React from "react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { twMerge } from "tailwind-merge";

export const Dialog = ({ open, onOpenChange, children, contentClassName }: { open: boolean; onOpenChange: (v: boolean) => void; children: React.ReactNode; contentClassName?: string }) => (
  <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-50 bg-neutral-700/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
      {(() => {
        const baseCentered = "fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2";
        const baseOverlay = "fixed inset-0 z-50 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-top-4 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-top-4";
        const needsOverlay = !!contentClassName && /(inset-|left-|right-|top-|bottom-|translate-)/.test(contentClassName);
        const base = needsOverlay ? baseOverlay : baseCentered;
        return (
          <RadixDialog.Content className={twMerge(base, contentClassName)}>
            {children}
          </RadixDialog.Content>
        );
      })()}
    </RadixDialog.Portal>
  </RadixDialog.Root>
);

export function DialogContent({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={twMerge("rounded-md border border-neutral-200 bg-white p-4 shadow-xl", className)}>{children}</div>;
}

export function DialogHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={twMerge("mb-3 flex items-center justify-between", className)}>{children}</div>;
}

export function DialogTitle({ className, children }: { className?: string; children: React.ReactNode }) {
  return <h2 className={twMerge("text-base font-semibold", className)}>{children}</h2>;
}
