import * as React from "react";
import { twMerge } from "tailwind-merge";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={twMerge("flex min-h-[80px] w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-900", className)}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
