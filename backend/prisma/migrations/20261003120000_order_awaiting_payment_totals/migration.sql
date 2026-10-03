ALTER TABLE "Order"
  ADD COLUMN "subtotalMinor" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "deliveryMinor" INTEGER NOT NULL DEFAULT 0;

UPDATE "Order"
SET "subtotalMinor" = "totalMinor" + "discountMinor";

ALTER TABLE "OrderItem"
  ADD COLUMN "shippingFeeMinor" INTEGER;
