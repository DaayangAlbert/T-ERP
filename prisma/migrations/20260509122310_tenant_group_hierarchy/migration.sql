-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "isGroup" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "sector" TEXT;

-- CreateIndex
CREATE INDEX "tenants_parentId_idx" ON "tenants"("parentId");

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
