import { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={twMerge("rounded border bg-white p-4", className)}>{children}</div>;
}

export function CardHeader({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={twMerge("mb-2 flex items-center justify-between", className)}>{children}</div>;
}

export function CardTitle({ className, children }: { className?: string; children: ReactNode }) {
  return <h2 className={twMerge("text-lg font-medium", className)}>{children}</h2>;
}
