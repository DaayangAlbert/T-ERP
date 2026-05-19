import { createHmac, randomBytes, randomUUID, timingSafeEqual } from "crypto";

export interface PayslipVerificationPayload {
  tenantId: string;
  userId: string;
  periodIso: string;
  uuid: string;
  code: string;
}

export interface PayslipVerification {
  verificationUuid: string;
  verificationCode: string;
  verificationHash: string;
  verifiedPublicUrl: string;
}

function secret(): string {
  return process.env.JWT_SECRET ?? process.env.NEXTAUTH_SECRET ?? "t-erp-dev-payroll-secret";
}

export function buildVerificationHash(payload: PayslipVerificationPayload): string {
  const message = [
    payload.tenantId,
    payload.userId,
    payload.periodIso,
    payload.uuid,
    payload.code,
  ].join(":");

  return createHmac("sha256", secret()).update(message).digest("hex");
}

export function createPayslipVerification(input: {
  tenantId: string;
  userId: string;
  periodIso: string;
}): PayslipVerification {
  const uuid = randomUUID();
  const code = randomBytes(4).toString("hex").toUpperCase();
  const hash = buildVerificationHash({
    tenantId: input.tenantId,
    userId: input.userId,
    periodIso: input.periodIso,
    uuid,
    code,
  });

  return {
    verificationUuid: uuid,
    verificationCode: code,
    verificationHash: hash,
    verifiedPublicUrl: `/payslip/verify/${uuid}`,
  };
}

export function verifyPayslipHash(input: {
  tenantId: string;
  userId: string;
  periodIso: string;
  verificationUuid: string | null;
  verificationCode: string | null;
  verificationHash: string | null;
}): boolean {
  if (!input.verificationUuid || !input.verificationCode || !input.verificationHash) return false;

  const expected = buildVerificationHash({
    tenantId: input.tenantId,
    userId: input.userId,
    periodIso: input.periodIso,
    uuid: input.verificationUuid,
    code: input.verificationCode,
  });
  const actualBuffer = Buffer.from(input.verificationHash, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (actualBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(actualBuffer, expectedBuffer);
}
