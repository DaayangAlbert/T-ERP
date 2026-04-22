import { cn } from "@/shared/utils/cn";

export function EditableFieldList({ className, children, ...props }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[20px] border border-[color:var(--app-border)] bg-[color:var(--app-card-muted)] shadow-[var(--app-shadow-sm)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function EditableFieldRow({ label, hint, className, controlClassName, multiline = false, children }) {
  return (
    <div
      className={cn(
        "grid gap-3 border-b border-[color:var(--app-border)] px-4 py-4 last:border-b-0",
        multiline ? "lg:grid-cols-[0.82fr_1.18fr]" : "lg:grid-cols-[0.82fr_1.18fr] lg:items-center",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</p>
        {hint ? <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{hint}</p> : null}
      </div>
      <div className={cn("min-w-0", controlClassName)}>{children}</div>
    </div>
  );
}
