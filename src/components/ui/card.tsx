import { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export function Card({ className, children, elevation = "none" }: { className?: string; children: ReactNode; elevation?: "none" | "sm" | "md" | "lg" }) {
  const shadowClass = elevation === "none" ? "shadow-none" : elevation === "sm" ? "shadow-sm" : elevation === "md" ? "shadow-md" : "shadow-lg";
  return <div className={twMerge("rounded-xl border border-[var(--border)] bg-white p-4", shadowClass, className)}>{children}</div>;
}

export function CardHeader({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={twMerge("mb-2 flex items-center justify-between", className)}>{children}</div>;
}

export function CardTitle({ className, children }: { className?: string; children: ReactNode }) {
  return <h2 className={twMerge("text-lg font-medium", className)}>{children}</h2>;
}
