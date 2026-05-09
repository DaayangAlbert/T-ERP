"use client";

import Link from "next/link";
import { ReportType } from "@prisma/client";
import { ArrowRight, FileText, Calendar, BookOpen, FileBarChart } from "lucide-react";

interface Props {
  type: ReportType;
  title: string;
  description: string;
  features: string[];
  pages: number;
}

const ICON: Record<ReportType, typeof FileText> = {
  EXECUTIVE_SUMMARY: FileText,
  MONTHLY_DASHBOARD: FileBarChart,
  ANNUAL_GROUP: BookOpen,
  QUARTERLY_NOTE: Calendar,
  CUSTOM: FileText,
};

export function StrategicReportCard({ type, title, description, features, pages }: Props) {
  const Icon = ICON[type];
  return (
    <Link
      href={`/rapports/nouveau?type=${type}`}
      className="group flex flex-col rounded-xl border border-primary-200 bg-gradient-to-br from-primary-50/60 to-white p-4 shadow-card transition hover:border-primary-400 hover:shadow-brand-lg"
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary-500 text-white">
          <Icon className="h-4 w-4" />
        </span>
        <div className="flex-1">
          <h3 className="text-[14px] font-semibold text-ink">{title}</h3>
          <p className="text-[10.5px] uppercase tracking-wider text-primary-700">{pages} page{pages > 1 ? "s" : ""} A4</p>
        </div>
      </div>
      <p className="mb-3 text-[12.5px] text-ink-2">{description}</p>
      <ul className="mb-3 flex-1 space-y-1 text-[11.5px] text-ink-3">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-1.5">
            <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-primary-400" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <span className="inline-flex items-center gap-1 text-[12px] font-medium text-primary-700 group-hover:text-primary-800">
        Générer <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
