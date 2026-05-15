-- Payroll generation, employee snapshots and public verification

ALTER TABLE "payslips" ADD COLUMN "payrollCycleId" TEXT;
ALTER TABLE "payslips" ADD COLUMN "snapshotId" TEXT;
ALTER TABLE "payslips" ADD COLUMN "verificationUuid" TEXT;
ALTER TABLE "payslips" ADD COLUMN "verificationCode" TEXT;
ALTER TABLE "payslips" ADD COLUMN "verificationHash" TEXT;
ALTER TABLE "payslips" ADD COLUMN "verifiedPublicUrl" TEXT;
ALTER TABLE "payslips" ADD COLUMN "issuedAt" TIMESTAMP(3);
ALTER TABLE "payslips" ADD COLUMN "cancelledAt" TIMESTAMP(3);
ALTER TABLE "payslips" ADD COLUMN "replacedById" TEXT;

CREATE TABLE "payroll_employee_snapshots" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "payrollCycleId" TEXT NOT NULL,
    "employeeKey" TEXT NOT NULL,
    "userId" TEXT,
    "matricule" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "position" TEXT,
    "category" TEXT,
    "echelon" TEXT,
    "department" TEXT,
    "site" TEXT,
    "contractType" TEXT,
    "hireDate" TIMESTAMP(3),
    "cnpsNumber" TEXT,
    "taxNumber" TEXT,
    "bankName" TEXT,
    "bankAccount" TEXT,
    "profilePhotoUrl" TEXT,
    "baseSalary" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_employee_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payslips_verificationUuid_key" ON "payslips"("verificationUuid");
CREATE INDEX "payslips_payrollCycleId_idx" ON "payslips"("payrollCycleId");
CREATE INDEX "payslips_verificationUuid_idx" ON "payslips"("verificationUuid");

CREATE UNIQUE INDEX "payroll_employee_snapshots_payrollCycleId_employeeKey_key"
  ON "payroll_employee_snapshots"("payrollCycleId", "employeeKey");
CREATE INDEX "payroll_employee_snapshots_tenantId_payrollCycleId_idx"
  ON "payroll_employee_snapshots"("tenantId", "payrollCycleId");
CREATE INDEX "payroll_employee_snapshots_userId_idx"
  ON "payroll_employee_snapshots"("userId");

ALTER TABLE "payroll_employee_snapshots"
  ADD CONSTRAINT "payroll_employee_snapshots_payrollCycleId_fkey"
  FOREIGN KEY ("payrollCycleId") REFERENCES "payroll_cycles"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payroll_employee_snapshots"
  ADD CONSTRAINT "payroll_employee_snapshots_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payslips"
  ADD CONSTRAINT "payslips_payrollCycleId_fkey"
  FOREIGN KEY ("payrollCycleId") REFERENCES "payroll_cycles"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payslips"
  ADD CONSTRAINT "payslips_snapshotId_fkey"
  FOREIGN KEY ("snapshotId") REFERENCES "payroll_employee_snapshots"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
