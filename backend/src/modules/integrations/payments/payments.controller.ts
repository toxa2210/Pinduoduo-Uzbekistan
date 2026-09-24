import { Controller, Get, Headers, Param } from "@nestjs/common";
import { ClickService } from "./click.service";
import { PaymeService } from "./payme.service";
import { PaymentsService } from "./payments.service";
import { AuthService } from "../../auth/auth.service";

@Controller("payments")
export class PaymentsController {
  constructor(
    private readonly click: ClickService,
    private readonly payme: PaymeService,
    private readonly payments: PaymentsService,
    private readonly auth: AuthService
  ) {}

  @Get("orders/:orderId")
  async orderPayments(
    @Param("orderId") orderId: string,
    @Headers("authorization") authorization: string | undefined
  ) {
    const token = authorization?.replace(/^Bearer\s+/i, "") ?? "";
    const user = await this.auth.validateSession(token);
    return this.payments.getOrderPayment(orderId, user.id);
  }

  @Get("click/callback")
  clickCallbackGet() {
    return { status: "ok" };
  }
}
