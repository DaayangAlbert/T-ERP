"use client";

import Link from "next/link";
import { ReportType } from "@prisma/client";
import { ArrowRight, FileText, Calendar, BookOpen, FileBarChart, Wallet, ClipboardList, Landmark, ShieldCheck, FileSpreadsheet, Users, Activity, UserPlus, Scale, type LucideIcon } from "lucide-react";

interface Props {
  type: ReportType;
  title: string;
  description: string;
  features: string[];
  pages: number;
}

const ICON: Record<ReportType, LucideIcon> = {
  EXECUTIVE_SUMMARY: FileText,
  MONTHLY_DASHBOARD: FileBarChart,
  ANNUAL_GROUP: BookOpen,
  QUARTERLY_NOTE: Calendar,
  CUSTOM: FileText,
  DAF_TREASURY_WEEKLY: Wallet,
  DAF_FINANCIAL_MONTHLY: ClipboardList,
  DAF_BANKING_QUARTERLY: Landmark,
  DAF_CAC_QUARTERLY: ShieldCheck,
  DAF_DSF_PREP: FileSpreadsheet,
  // Comptable Bloc 2 / fn 2.2 — rapports comptables
  CPT_GENERAL_LEDGER: BookOpen,
  CPT_BALANCE_GENERAL: ClipboardList,
  CPT_BALANCE_AUX_SUPPLIERS: ClipboardList,
  CPT_BALANCE_AUX_CUSTOMERS: ClipboardList,
  CPT_JOURNAL_CENTRALIZER: FileText,
  CPT_MONTHLY_SYNTHESIS: FileBarChart,
  CPT_DSF_PREP: FileSpreadsheet,
  CPT_AGED_BALANCE_SUPPLIERS: ClipboardList,
  CPT_AGED_BALANCE_CUSTOMERS: ClipboardList,
  CPT_ANALYTICAL_CONSOLIDATED: FileBarChart,
  CPT_SITE_LEDGER: BookOpen,
  CPT_SITE_BALANCE: ClipboardList,
  CPT_SITE_EXPENSES: FileText,
  CPT_SITE_BILLINGS: FileText,
  CPT_SITE_MONTHLY: FileBarChart,
  // DT Bloc 2 / fn 2.2 — pré-existants dans le schema, ajoutés ici pour exhaustivité Record
  DT_WEEKLY_TECHNICAL: ClipboardList,
  DT_MONTHLY_PRODUCTION: FileBarChart,
  DT_QUARTERLY_TECHNICAL: FileText,
  DT_HSE_MONTHLY: ShieldCheck,
  DT_TENDERS_QUARTERLY: ClipboardList,
  DT_ISO_ANNUAL: ShieldCheck,
  DT_MOA_MONTHLY: FileText,
  // RH Bloc 2 / fn 2.2 — Reportings RH
  RH_MONTHLY: Users,
  RH_SOCIAL_ANNUAL: BookOpen,
  RH_GENDER_EQUALITY: Scale,
  RH_WEEKLY_DASHBOARD: Activity,
  RH_RECRUITMENT_QUARTERLY: UserPlus,
  RH_SOCIAL_INDICATORS: FileBarChart,
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
