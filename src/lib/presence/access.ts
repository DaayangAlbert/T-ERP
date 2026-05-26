import { Role } from "@prisma/client";

/**
 * Pointage de présence — règles de rôle (pures, partagées API + UI).
 *
 * - Tout le monde pointe SAUF le DG et le PCA (OWNER) : eux consultent.
 * - L'ouvrier (WORKER) pointe via son PWA /ouv/pointage (pas le module PRESENCE).
 * - Consultation TOUT (bureau + chantiers) : DG + PCA + RH + DAF.
 * - Consultation CHANTIERS uniquement : DT (Direction Technique).
 * - Consultation SON chantier : Chef de chantier (SITE_MANAGER).
 */

// Rayon de tolérance par défaut (m) si non configuré sur le lieu.
export const DEFAULT_ATTENDANCE_RADIUS_M = 150;

const NO_CLOCK_ROLES: Role[] = [Role.OWNER, Role.DG];
const VIEW_ALL_ROLES: Role[] = [Role.OWNER, Role.DG, Role.HR, Role.DAF];
const VIEW_SITES_ROLES: Role[] = [Role.TECH_DIRECTOR];

export function canClockIn(role: Role): boolean {
  return !NO_CLOCK_ROLES.includes(role);
}

export function canViewAllAttendance(role: Role): boolean {
  return VIEW_ALL_ROLES.includes(role);
}

/** Voit les pointages de tout le personnel SUR CHANTIER (siteId non nul). */
export function canViewSitesAttendance(role: Role): boolean {
  return VIEW_SITES_ROLES.includes(role);
}

export function canViewSiteAttendance(role: Role): boolean {
  return role === Role.SITE_MANAGER;
}

/**
 * Date « du jour » (minuit UTC sur les composantes UTC courantes) — alignée
 * sur la convention du pointage ouvrier (TimeReport.userId_date), pour
 * partager la même clé unique et éviter les doublons.
 */
export function todayDate(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
