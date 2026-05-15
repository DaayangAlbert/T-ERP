import { z } from "zod";

// Types ouvrier mappés sur LeaveType existant (cf décisions Bloc 0) :
//   annual → PAID_LEAVE
//   sick → SICK
//   family_event → FAMILY
//   unpaid → UNPAID
//   maternity → MATERNITY
//   paternity → PATERNITY
//   exceptional → OTHER
export const ouvLeaveTypeSchema = z.enum([
  "annual",
  "sick",
  "family_event",
  "unpaid",
  "maternity",
  "paternity",
  "exceptional",
]);
export type OuvLeaveType = z.infer<typeof ouvLeaveTypeSchema>;

export const annualLeaveRequestSchema = z.object({
  type: ouvLeaveTypeSchema.default("annual"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date début YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date fin YYYY-MM-DD"),
  reason: z.string().max(500).optional(),
});
export type AnnualLeaveRequestInput = z.infer<typeof annualLeaveRequestSchema>;

export const sickReportSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date début YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date fin YYYY-MM-DD"),
  symptoms: z.string().max(500).optional(),
  // Photo du certificat médical : dataURL base64 (jpg/png/webp).
  // Obligatoire si nb jours > 3.
  medicalCert: z.string().max(2_000_000).optional(),
});
export type SickReportInput = z.infer<typeof sickReportSchema>;

export const medicalCertUploadSchema = z.object({
  medicalCert: z.string().min(1).max(2_000_000),
});
export type MedicalCertUploadInput = z.infer<typeof medicalCertUploadSchema>;

// Map ouvLeaveType → Prisma LeaveType
export function mapToPrismaLeaveType(t: OuvLeaveType):
  | "PAID_LEAVE"
  | "SICK"
  | "FAMILY"
  | "UNPAID"
  | "MATERNITY"
  | "PATERNITY"
  | "OTHER" {
  switch (t) {
    case "annual":
      return "PAID_LEAVE";
    case "sick":
      return "SICK";
    case "family_event":
      return "FAMILY";
    case "unpaid":
      return "UNPAID";
    case "maternity":
      return "MATERNITY";
    case "paternity":
      return "PATERNITY";
    case "exceptional":
      return "OTHER";
  }
}

// Map inverse pour l'UI (LeaveType → libellé court FR)
export function leaveTypeLabel(type: string): string {
  switch (type) {
    case "PAID_LEAVE":
      return "Congé annuel";
    case "SICK":
      return "Arrêt maladie";
    case "FAMILY":
      return "Événement familial";
    case "UNPAID":
      return "Congé sans solde";
    case "MATERNITY":
      return "Congé maternité";
    case "PATERNITY":
      return "Congé paternité";
    case "RTT":
      return "RTT";
    case "COMPENSATORY":
      return "Récupération heures sup";
    default:
      return "Autre";
  }
}
