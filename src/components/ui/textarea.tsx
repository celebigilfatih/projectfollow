import * as React from "react";
import { twMerge } from "tailwind-merge";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={twMerge("flex min-h-[80px] w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm", className)}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
