import * as React from "react";
import { twMerge } from "tailwind-merge";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={twMerge("rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm", className)}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";

