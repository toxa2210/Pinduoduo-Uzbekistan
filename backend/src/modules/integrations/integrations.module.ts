import { Module } from "@nestjs/common";
import { PinduoduoModule } from "./pinduoduo/pinduoduo.module";
import { PaymentsModule } from "./payments/payments.module";

@Module({
  imports: [PinduoduoModule, PaymentsModule],
  exports: [PinduoduoModule, PaymentsModule]
})
export class IntegrationsModule {}
