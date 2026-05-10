-- CreateTable
CREATE TABLE "payroll_inputs" (
    "id" TEXT NOT NULL,
    "payrollCycleId" TEXT NOT NULL,
    "employeeKey" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "daysWorked" INTEGER NOT NULL DEFAULT 0,
    "hoursWorked" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overtimeHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bonuses" JSONB NOT NULL DEFAULT '[]',
    "advances" BIGINT NOT NULL DEFAULT 0,
    "deductions" JSONB NOT NULL DEFAULT '[]',
    "savedAt" TIMESTAMP(3),
    "savedBy" TEXT,

    CONSTRAINT "payroll_inputs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payroll_inputs_payrollCycleId_category_idx" ON "payroll_inputs"("payrollCycleId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_inputs_payrollCycleId_employeeKey_key" ON "payroll_inputs"("payrollCycleId", "employeeKey");

-- AddForeignKey
ALTER TABLE "payroll_inputs" ADD CONSTRAINT "payroll_inputs_payrollCycleId_fkey" FOREIGN KEY ("payrollCycleId") REFERENCES "payroll_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
