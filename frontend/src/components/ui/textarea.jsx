import { cn } from "@/shared/utils/cn";

export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(
        "app-field min-h-[112px] w-full px-3.5 py-3 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500",
        className
      )}
      {...props}
    />
  );
}
