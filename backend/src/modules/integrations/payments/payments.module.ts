import { Module } from "@nestjs/common";
import { ClickService } from "./click.service";
import { PaymeService } from "./payme.service";
import { PaymentsController } from "./payments.controller";

@Module({
  controllers: [PaymentsController],
  providers: [ClickService, PaymeService],
  exports: [ClickService, PaymeService]
})
export class PaymentsModule {}
