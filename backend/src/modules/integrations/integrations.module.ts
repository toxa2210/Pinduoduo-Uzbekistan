import { Module } from "@nestjs/common";
import { AliexpressModule } from "./aliexpress/aliexpress.module";
import { PaymentsModule } from "./payments/payments.module";

@Module({
  imports: [AliexpressModule, PaymentsModule],
  exports: [AliexpressModule, PaymentsModule]
})
export class IntegrationsModule {}
