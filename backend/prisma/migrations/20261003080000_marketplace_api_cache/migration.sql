CREATE TABLE "MarketplaceApiCache" (
    "cacheKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketplaceApiCache_pkey" PRIMARY KEY ("cacheKey")
);

CREATE INDEX "MarketplaceApiCache_expiresAt_idx" ON "MarketplaceApiCache"("expiresAt");
