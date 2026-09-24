import { Module } from "@nestjs/common";
import { ClickService } from "./click.service";
import { PaymeService } from "./payme.service";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { PaynetController } from "./paynet.controller";
import { PaynetService } from "./paynet.service";

@Module({
  controllers: [PaymentsController, PaynetController],
  providers: [PaymentsService, ClickService, PaymeService, PaynetService],
  exports: [PaymentsService, ClickService, PaymeService, PaynetService]
})
export class PaymentsModule {}
