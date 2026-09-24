-- Add idempotency constraint for provider callbacks.
CREATE UNIQUE INDEX "Payment_provider_externalRef_key" ON "Payment"("provider", "externalRef");
