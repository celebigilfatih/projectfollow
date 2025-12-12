import * as React from "react";
import { twMerge } from "tailwind-merge";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={twMerge("flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm", className)}
      {...props}
    />
  )
);
Input.displayName = "Input";
