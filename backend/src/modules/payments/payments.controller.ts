import { Body, Controller, Headers, Param, Post } from "@nestjs/common";
import { IsEnum, IsNotEmpty, IsString } from "class-validator";
import { AuthService } from "../auth/auth.service";
import { PaymentProvider } from "./payment.types";
import { PaymentsService } from "./payments.service";

class CreatePaymentDto { @IsString() @IsNotEmpty() orderId!: string; @IsEnum(PaymentProvider) provider!: PaymentProvider; }

@Controller("payments")
export class PaymentsController {
  constructor(private readonly payments: PaymentsService, private readonly auth: AuthService) {}
  private token(value?: string) { return value?.replace(/^Bearer\s+/i, "") ?? ""; }
  @Post()
  async create(@Headers("authorization") authorization: string | undefined, @Headers("idempotency-key") key: string | undefined, @Body() body: CreatePaymentDto) {
    const user = await this.auth.validateSession(this.token(authorization));
    return this.payments.create(user.id, body.orderId, body.provider, key ?? `payment-${body.orderId}`);
  }
  @Post("mock/:orderId/confirm")
  async mockConfirm(@Headers("authorization") authorization: string | undefined, @Param("orderId") orderId: string) {
    const user = await this.auth.validateSession(this.token(authorization));
    return this.payments.mockConfirm(user.id, orderId);
  }
}
