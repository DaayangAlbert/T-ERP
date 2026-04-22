import { cn } from "@/shared/utils/cn";

export function Card({ className, ...props }) {
  return (
    <section
      className={cn(
        "rounded-[22px] border border-[color:var(--app-border)] bg-[color:var(--app-card)] p-5 shadow-[var(--app-shadow-sm)] backdrop-blur-sm transition-colors duration-200 dark:border-[color:var(--app-border)] dark:bg-[color:var(--app-card)]",
        className
      )}
      {...props}
    />
  );
}
