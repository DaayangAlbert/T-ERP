import { forwardRef } from "react";

import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/shared/utils/cn";

const variants = {
  primary:
    "border border-primary bg-primary text-white shadow-[0_18px_38px_-22px_rgba(37,99,235,0.58)] hover:border-secondary hover:bg-secondary",
  outline:
    "border border-[color:var(--app-border-strong)] bg-white/90 text-slate-700 shadow-sm hover:border-primary/25 hover:bg-white dark:border-[color:var(--app-border-strong)] dark:bg-slate-950/80 dark:text-slate-100 dark:hover:border-blue-400/35 dark:hover:bg-slate-900",
  ghost:
    "border border-transparent bg-transparent text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/80",
};

export const Button = forwardRef(function Button(
  { asChild = false, className, variant = "primary", type = "button", ...props },
  ref
) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      ref={ref}
      type={asChild ? undefined : type}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        className
      )}
      {...props}
    />
  );
});
