CREATE TABLE "AliexpressOAuthState" (
    "stateHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AliexpressOAuthState_pkey" PRIMARY KEY ("stateHash")
);

CREATE INDEX IF NOT EXISTS "AliexpressOAuthState_expiresAt_idx" ON "AliexpressOAuthState"("expiresAt");

CREATE TABLE "AliexpressCredential" (
    "id" TEXT NOT NULL DEFAULT 'primary',
    "accessTokenCiphertext" TEXT NOT NULL,
    "refreshTokenCiphertext" TEXT NOT NULL,
    "accessTokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AliexpressCredential_pkey" PRIMARY KEY ("id")
);
