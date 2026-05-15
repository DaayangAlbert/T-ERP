import { z } from "zod";

export const attestationTypeSchema = z.enum([
  "SALARY",
  "EMPLOYMENT",
  "PRESENCE",
  "LEAVE_TAKEN",
  "OTHER",
]);
export type OuvAttestationType = z.infer<typeof attestationTypeSchema>;

export const attestationRequestSchema = z.object({
  type: attestationTypeSchema,
  purpose: z.string().max(300).optional(),
});
export type AttestationRequestInput = z.infer<typeof attestationRequestSchema>;

export function attestationTypeLabel(t: OuvAttestationType): string {
  switch (t) {
    case "SALARY":
      return "Attestation de salaire";
    case "EMPLOYMENT":
      return "Attestation de travail";
    case "PRESENCE":
      return "Attestation de présence";
    case "LEAVE_TAKEN":
      return "Attestation de congés pris";
    case "OTHER":
      return "Autre attestation";
  }
}
