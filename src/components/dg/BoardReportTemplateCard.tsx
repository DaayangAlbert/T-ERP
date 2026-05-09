"use client";

import Link from "next/link";
import { Calendar, FileBarChart, FileText } from "lucide-react";
import type { BoardReportType } from "@prisma/client";

interface Props {
  type: BoardReportType;
  title: string;
  description: string;
  features: string[];
  href: string;
}

const ICONS: Record<BoardReportType, React.ReactNode> = {
  MONTHLY: <Calendar className="h-5 w-5" />,
  QUARTERLY: <FileBarChart className="h-5 w-5" />,
  ANNUAL: <FileText className="h-5 w-5" />,
  EXTRAORDINARY: <FileText className="h-5 w-5" />,
};

export function BoardReportTemplateCard({ type, title, description, features, href }: Props) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-xl border border-line bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-brand-lg"
    >
      <div className="mb-3 grid h-10 w-10 place-items-center rounded-md bg-primary-50 text-primary-700">
        {ICONS[type]}
      </div>
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      <p className="mt-1 text-[12.5px] text-ink-3">{description}</p>
      <ul className="mt-3 space-y-1 text-[11.5px] text-ink-2">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-1.5">
            <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-primary-500" />
            {f}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-end">
        <span className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary-500 px-3 text-[12px] font-medium text-white transition group-hover:bg-primary-600">
          Générer →
        </span>
      </div>
    </Link>
  );
}
