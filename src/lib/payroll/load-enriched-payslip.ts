/**
 * Chargement enrichi d'un bulletin pour rendu officiel (écran + PDF).
 *
 * Centralise :
 *   - le SELECT Prisma complet (employé, tenant, lignes, snapshot, vérification)
 *   - la génération opportuniste de bulletinNumber + verification + IP
 *   - le calcul des cumuls annuels + congés/absences via bulletin-helpers
 *
 * Retour : payload JSON-safe (BigInt → string, Date → ISO).
 */
import type { PayslipLineCategory, PayslipStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { uploadUrlToDataUri } from "@/lib/upload-paths";
import { createPayslipVerification } from "./payroll-verification";
import {
  amountToWordsFr,
  categorizeLineByCode,
  ensureBulletinNumber,
  getLeaveAndAbsenceStats,
  getYearlyCumulatives,
} from "./bulletin-helpers";

export interface EnrichedPayslipLine {
  id: string;
  code: string;
  label: string;
  quantity: number | null;
  base: string | null;
  rate: number | null;
  amountPlus: string | null;
  amountMinus: string | null;
  employerAmount: string | null;
  order: number;
  category: PayslipLineCategory;
}

export interface EnrichedPayslipDetail {
  id: string;
  bulletinNumber: string;
  period: string;
  periodEnd: string | null;
  paymentDate: string;
  paymentMode: string;
  paymentMethod: string;
  paymentBankAccount: string | null;
  paymentReference: string | null;
  grossAmount: string;
  taxableGross: string;
  netAmount: string;
  socialCharges: string;
  fiscalCharges: string;
  employerCharges: string;
  cnpsAmount: string;
  irppAmount: string;
  otherDeductions: string;
  netInWords: string;
  status: PayslipStatus;
  pdfUrl: string | null;
  generatedIp: string | null;
  issuedAt: string | null;
  verificationUuid: string;
  verificationCode: string;
  verifiedPublicUrl: string;
  workedDays: number;
  reportedHours: number;
  lines: EnrichedPayslipLine[];
  user: {
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string | null;
    employeeId: string | null;
    matricule: string | null;
    position: string | null;
    category: string | null;
    professionalCategory: string | null;
    echelon: string | null;
    classCategory: string | null;
    indiceSalarial: number | null;
    coefficientSalarial: number | null;
    department: string | null;
    cnpsNumber: string | null;
    cnpsCardNumber: string | null;
    niu: string | null;
    hireDate: string | null;
    contractType: string | null;
    familyStatus: string | null;
    bankName: string | null;
    bankAgency: string | null;
    rib: string | null;
  };
  snapshot: {
    fullName: string;
    matricule: string;
    position: string | null;
    category: string | null;
    contractType: string | null;
    hireDate: string | null;
    cnpsNumber: string | null;
    bankName: string | null;
    bankAccount: string | null;
    profilePhotoUrl: string | null;
  } | null;
  tenant: {
    name: string;
    legalForm: string | null;
    taxId: string | null;
    cnpsId: string | null;
    logoUrl: string | null;
    primaryColor: string | null;
    contactAddress: string | null;
    contactPhone: string | null;
    contactEmail: string | null;
    websiteUrl: string | null;
    signatureImageUrl: string | null;
    stampImageUrl: string | null;
    drhSignatoryName: string | null;
  };
  cumul: {
    salary: string;
    bonuses: string;
    overtime: string;
    taxable: string;
    deductions: string;
    net: string;
  };
  leave: {
    acquired: number;
    taken: number;
    remaining: number;
    unjustifiedAbsenceDays: number;
    delayHours: number;
  };
}

/**
 * Charge un bulletin et l'enrichit (cumuls, congés, numéro, vérification).
 * Filtre `where` pour permettre des contextes d'accès différents (owner / DAF).
 */
export async function loadEnrichedPayslip(args: {
  payslipId: string;
  ownerUserId?: string;
  clientIp?: string | null;
  /**
   * Si true, convertit logo/signature/cachet/avatar en data URI base64
   * (lecture disque). Indispensable pour le rendu PDF react-pdf côté serveur
   * qui ne résout pas les URLs relatives. À ne PAS activer pour l'écran
   * (le navigateur résout les URLs relatives nativement, plus léger).
   */
  inlineImages?: boolean;
}): Promise<EnrichedPayslipDetail | null> {
  const where = args.ownerUserId
    ? { id: args.payslipId, userId: args.ownerUserId }
    : { id: args.payslipId };

  const payslip = await prisma.payslip.findFirst({
    where,
    include: {
      lines: { orderBy: { order: "asc" } },
      snapshot: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          avatarUrl: true,
          employeeId: true,
          matricule: true,
          position: true,
          category: true,
          professionalCategory: true,
          echelon: true,
          classCategory: true,
          indiceSalarial: true,
          coefficientSalarial: true,
          department: true,
          cnpsNumber: true,
          cnpsCardNumber: true,
          niu: true,
          hireDate: true,
          contractType: true,
          familyStatus: true,
          bankName: true,
          bankAgency: true,
          rib: true,
        },
      },
      tenant: {
        select: {
          name: true,
          legalForm: true,
          taxId: true,
          cnpsId: true,
          logoUrl: true,
          primaryColor: true,
          contactAddress: true,
          contactPhone: true,
          contactEmail: true,
          websiteUrl: true,
          signatureImageUrl: true,
          stampImageUrl: true,
          drhSignatoryName: true,
        },
      },
    },
  });

  if (!payslip) return null;

  const hasVerification = Boolean(
    payslip.verificationUuid &&
      payslip.verificationCode &&
      payslip.verificationHash &&
      payslip.verifiedPublicUrl
  );

  const verification = hasVerification
    ? {
        verificationUuid: payslip.verificationUuid!,
        verificationCode: payslip.verificationCode!,
        verifiedPublicUrl: payslip.verifiedPublicUrl!,
      }
    : createPayslipVerification({
        tenantId: payslip.tenantId,
        userId: payslip.userId,
        periodIso: payslip.period.toISOString(),
      });

  const updates: Record<string, unknown> = {};
  if (!hasVerification) {
    updates.verificationUuid = verification.verificationUuid;
    updates.verificationCode = verification.verificationCode;
    if ("verificationHash" in verification) updates.verificationHash = verification.verificationHash;
    updates.verifiedPublicUrl = verification.verifiedPublicUrl;
  }
  if (args.clientIp && payslip.generatedIp !== args.clientIp) {
    updates.generatedIp = args.clientIp;
  }
  if (Object.keys(updates).length > 0) {
    await prisma.payslip.update({ where: { id: payslip.id }, data: updates });
  }

  const bulletinNumber = await ensureBulletinNumber(prisma, {
    id: payslip.id,
    tenantId: payslip.tenantId,
    period: payslip.period,
    bulletinNumber: payslip.bulletinNumber,
  });

  const [cumul, leave] = await Promise.all([
    getYearlyCumulatives(prisma, payslip.userId, payslip.period),
    getLeaveAndAbsenceStats(prisma, payslip.userId, payslip.period),
  ]);

  // Pour le PDF (react-pdf côté serveur) : convertit les images en data URI
  // base64 car les URLs relatives /uploads/... ne sont pas résolvables.
  let tenantImages = {
    logoUrl: payslip.tenant.logoUrl,
    signatureImageUrl: payslip.tenant.signatureImageUrl,
    stampImageUrl: payslip.tenant.stampImageUrl,
  };
  let avatarUrl = payslip.user.avatarUrl;
  if (args.inlineImages) {
    const [logo, sig, stamp, avatar] = await Promise.all([
      uploadUrlToDataUri(payslip.tenant.logoUrl),
      uploadUrlToDataUri(payslip.tenant.signatureImageUrl),
      uploadUrlToDataUri(payslip.tenant.stampImageUrl),
      uploadUrlToDataUri(payslip.user.avatarUrl),
    ]);
    tenantImages = { logoUrl: logo, signatureImageUrl: sig, stampImageUrl: stamp };
    avatarUrl = avatar;
  }

  return {
    id: payslip.id,
    bulletinNumber,
    period: payslip.period.toISOString(),
    periodEnd: payslip.periodEnd?.toISOString() ?? null,
    paymentDate: payslip.paymentDate.toISOString(),
    paymentMode: payslip.paymentMode,
    paymentMethod: payslip.paymentMethod,
    paymentBankAccount: payslip.paymentBankAccount,
    paymentReference: payslip.paymentReference,
    grossAmount: payslip.grossAmount.toString(),
    taxableGross: payslip.taxableGross.toString(),
    netAmount: payslip.netAmount.toString(),
    socialCharges: payslip.socialCharges.toString(),
    fiscalCharges: payslip.fiscalCharges.toString(),
    employerCharges: payslip.employerCharges.toString(),
    cnpsAmount: payslip.cnpsAmount.toString(),
    irppAmount: payslip.irppAmount.toString(),
    otherDeductions: payslip.otherDeductions.toString(),
    netInWords: amountToWordsFr(payslip.netAmount),
    status: payslip.status,
    pdfUrl: payslip.pdfUrl,
    generatedIp: args.clientIp ?? payslip.generatedIp,
    issuedAt: payslip.issuedAt?.toISOString() ?? null,
    verificationUuid: verification.verificationUuid,
    verificationCode: verification.verificationCode,
    verifiedPublicUrl: verification.verifiedPublicUrl,
    workedDays: payslip.workedDays,
    reportedHours: payslip.reportedHours,
    lines: payslip.lines.map((l) => ({
      id: l.id,
      code: l.code,
      label: l.label,
      quantity: l.quantity,
      base: l.base?.toString() ?? null,
      rate: l.rate,
      amountPlus: l.amountPlus?.toString() ?? null,
      amountMinus: l.amountMinus?.toString() ?? null,
      employerAmount: l.employerAmount?.toString() ?? null,
      order: l.order,
      category: l.category ?? categorizeLineByCode(l.code),
    })),
    user: {
      ...payslip.user,
      avatarUrl,
      hireDate: payslip.user.hireDate?.toISOString() ?? null,
    },
    snapshot: payslip.snapshot
      ? {
          fullName: payslip.snapshot.fullName,
          matricule: payslip.snapshot.matricule,
          position: payslip.snapshot.position,
          category: payslip.snapshot.category,
          contractType: payslip.snapshot.contractType,
          hireDate: payslip.snapshot.hireDate?.toISOString() ?? null,
          cnpsNumber: payslip.snapshot.cnpsNumber,
          bankName: payslip.snapshot.bankName,
          bankAccount: payslip.snapshot.bankAccount,
          profilePhotoUrl: payslip.snapshot.profilePhotoUrl,
        }
      : null,
    tenant: { ...payslip.tenant, ...tenantImages },
    cumul: {
      salary: cumul.cumulSalary.toString(),
      bonuses: cumul.cumulBonuses.toString(),
      overtime: cumul.cumulOvertime.toString(),
      taxable: cumul.cumulTaxable.toString(),
      deductions: cumul.cumulDeductions.toString(),
      net: cumul.cumulNet.toString(),
    },
    leave: {
      acquired: leave.paidLeaveAcquired,
      taken: leave.paidLeaveTaken,
      remaining: leave.paidLeaveRemaining,
      unjustifiedAbsenceDays: leave.unjustifiedAbsenceDays,
      delayHours: leave.delayHours,
    },
  };
}
