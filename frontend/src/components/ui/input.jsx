import { cn } from "@/shared/utils/cn";

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        "app-field w-full px-3.5 py-2.5 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500",
        className
      )}
      {...props}
    />
  );
}
