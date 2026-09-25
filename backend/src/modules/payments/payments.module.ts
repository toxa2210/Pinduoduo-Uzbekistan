import { Module } from "@nestjs/common";
import { PrismaModule } from "../../database/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { MockPaymentAdapter } from "./mock-payment.adapter";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";

@Module({ imports: [PrismaModule, AuthModule], controllers: [PaymentsController], providers: [PaymentsService, MockPaymentAdapter], exports: [PaymentsService] })
export class PaymentsModule {}
