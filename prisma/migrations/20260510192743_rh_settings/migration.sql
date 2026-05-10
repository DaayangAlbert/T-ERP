-- CreateTable
CREATE TABLE "rh_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "alertsConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rh_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rh_settings_userId_key" ON "rh_settings"("userId");

-- AddForeignKey
ALTER TABLE "rh_settings" ADD CONSTRAINT "rh_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
