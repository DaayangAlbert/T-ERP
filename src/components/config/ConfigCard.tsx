"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { clsx } from "clsx";

interface Props {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  v1: boolean;
}

export function ConfigCard({ href, title, description, icon, v1 }: Props) {
  return (
    <Link
      href={href}
      className={clsx(
        "group relative flex flex-col rounded-xl border bg-white p-4 shadow-card transition",
        v1 ? "border-line hover:border-primary-300 hover:shadow-brand-lg" : "border-dashed border-line bg-surface-alt"
      )}
    >
      {!v1 && (
        <span className="absolute right-3 top-3 rounded bg-warning/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-warning">
          V2
        </span>
      )}
      <div className="mb-2 flex items-center gap-2">
        <span
          className={clsx(
            "grid h-9 w-9 place-items-center rounded-lg",
            v1 ? "bg-primary-100 text-primary-700" : "bg-ink-3/10 text-ink-3"
          )}
        >
          {icon}
        </span>
        <h3 className="text-[14px] font-semibold text-ink">{title}</h3>
      </div>
      <p className="flex-1 text-[12.5px] text-ink-2">{description}</p>
      <span
        className={clsx(
          "mt-3 inline-flex items-center gap-1 text-[12px] font-medium",
          v1 ? "text-primary-700" : "text-ink-3"
        )}
      >
        {v1 ? "Configurer" : "Bientôt disponible"}{" "}
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
