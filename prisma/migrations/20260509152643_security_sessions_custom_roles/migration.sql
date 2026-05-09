-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "location" TEXT,
    "suspicious" BOOLEAN NOT NULL DEFAULT false,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_roles" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "basedOn" "Role" NOT NULL,
    "permissions" JSONB NOT NULL,
    "userCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sessions_userId_expiresAt_idx" ON "sessions"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "custom_roles_tenantId_idx" ON "custom_roles"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "custom_roles_tenantId_name_key" ON "custom_roles"("tenantId", "name");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
