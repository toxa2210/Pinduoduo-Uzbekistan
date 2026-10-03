import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AliexpressModule } from "../integrations/aliexpress/aliexpress.module";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";

@Module({
  imports: [AuthModule, AliexpressModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}