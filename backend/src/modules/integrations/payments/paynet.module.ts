import { Module } from "@nestjs/common";
import { PaynetController } from "./paynet.controller";
import { PaynetService } from "./paynet.service";

@Module({
  controllers: [PaynetController],
  providers: [PaynetService],
  exports: [PaynetService]
})
export class PaynetModule {}
