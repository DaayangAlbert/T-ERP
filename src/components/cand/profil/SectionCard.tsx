"use client";

import type { ReactNode } from "react";
import { clsx } from "clsx";

interface Props {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SectionCard({ title, icon, action, children, className }: Props) {
  return (
    <section
      className={clsx(
        "rounded-lg border border-line bg-white shadow-card",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          {icon ? <span className="text-primary">{icon}</span> : null}
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
        </div>
        {action}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}
