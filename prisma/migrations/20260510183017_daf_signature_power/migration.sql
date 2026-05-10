-- CreateTable
CREATE TABLE "user_signature_powers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "soloLimit" BIGINT NOT NULL DEFAULT 5000000,
    "coSignLimit" BIGINT NOT NULL DEFAULT 50000000,
    "coSigners" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "banksRegistered" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "proxyHolders" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_signature_powers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_signature_powers_userId_key" ON "user_signature_powers"("userId");

-- AddForeignKey
ALTER TABLE "user_signature_powers" ADD CONSTRAINT "user_signature_powers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
