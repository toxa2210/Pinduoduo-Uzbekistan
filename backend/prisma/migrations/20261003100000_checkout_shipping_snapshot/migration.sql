ALTER TABLE "Order"
  ADD COLUMN "recipientName" TEXT,
  ADD COLUMN "recipientPhone" TEXT,
  ADD COLUMN "deliveryCity" TEXT,
  ADD COLUMN "discountMinor" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "promoCode" TEXT;

ALTER TABLE "OrderItem"
  ADD COLUMN "supplierProductId" TEXT,
  ADD COLUMN "supplierSkuId" TEXT,
  ADD COLUMN "productTitle" TEXT,
  ADD COLUMN "variantLabel" TEXT,
  ADD COLUMN "imageUrl" TEXT,
  ADD COLUMN "shippingOptionCode" TEXT,
  ADD COLUMN "shippingCompany" TEXT,
  ADD COLUMN "shippingFeeFormat" TEXT,
  ADD COLUMN "shippingCurrency" TEXT,
  ADD COLUMN "shippingMinDays" TEXT,
  ADD COLUMN "shippingMaxDays" TEXT,
  ADD COLUMN "shippingTracking" BOOLEAN,
  ADD COLUMN "shippingQuoteQuantity" INTEGER;
