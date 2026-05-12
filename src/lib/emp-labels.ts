/**
 * Libellés et couleurs partagés des enums Prisma pour l'espace EMP.
 *
 * Source de vérité unique — utilisé par les composants congés (Pending,
 * History, Team), par le wizard, et alignable avec les routes RH côté
 * superviseur si besoin d'une cohérence cross-espaces.
 */
import type { LeaveType, LeaveStatus, TimeStatus } from "@prisma/client";

export const LEAVE_TYPE_LABEL: Record<LeaveType, string> = {
  PAID_LEAVE: "Congés payés",
  RTT: "RTT",
  COMPENSATORY: "Récupération",
  UNPAID: "Sans solde",
  SICK: "Maladie",
  MATERNITY: "Maternité",
  PATERNITY: "Paternité",
  FAMILY: "Événement familial",
  OTHER: "Autre",
};

/** Couleur HEX pour palettes Recharts / calendriers RH. */
export const LEAVE_TYPE_COLOR: Record<LeaveType, string> = {
  PAID_LEAVE: "#22C55E",
  RTT: "#A855F7",
  COMPENSATORY: "#8B5CF6",
  UNPAID: "#94A3B8",
  SICK: "#EF4444",
  MATERNITY: "#EC4899",
  PATERNITY: "#3B82F6",
  FAMILY: "#F59E0B",
  OTHER: "#64748B",
};

export const LEAVE_STATUS_LABEL: Record<LeaveStatus, string> = {
  PENDING: "En attente",
  N1_APPROVED: "Validé N1",
  RH_APPROVED: "Validé",
  REJECTED: "Refusé",
  CANCELLED: "Annulé",
};

export const TIME_STATUS_LABEL: Record<TimeStatus, string> = {
  PRESENT: "En poste",
  ABSENT_JUSTIFIED: "Absence justifiée",
  ABSENT_UNJUSTIFIED: "Absence non justifiée",
  HOLIDAY: "Jour férié",
  LEAVE: "Congé",
  SICK: "Maladie",
};
