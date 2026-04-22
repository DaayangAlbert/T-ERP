import { accountingReportingModule } from "@/features/finance/modules/accountingReporting";
import { budgetingModule } from "@/features/finance/modules/budgeting";
import { treasuryModule } from "@/features/finance/modules/treasury";
import { payrollPlanningModule } from "@/features/finance/modules/payrollPlanning";
import { analyticsDecisionModule } from "@/features/finance/modules/analyticsDecision";
import { auditTrailModule } from "@/features/finance/modules/auditTrail";
import { projectCostControlModule } from "@/features/finance/modules/projectCostControl";
import { paymentDelaysBtpModule } from "@/features/finance/modules/paymentDelaysBtp";
import { siteReportingModule } from "@/features/finance/modules/siteReporting";

export const financeModuleRegistry = [
  accountingReportingModule,
  budgetingModule,
  treasuryModule,
  payrollPlanningModule,
  analyticsDecisionModule,
  auditTrailModule,
  projectCostControlModule,
  paymentDelaysBtpModule,
  siteReportingModule,
];
