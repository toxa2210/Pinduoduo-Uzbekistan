import { Body, Controller, Get, Headers, Param, Post } from "@nestjs/common";
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

  @Post("click/callback")
  clickCallback(@Body() body: Record<string, unknown>) {
    return this.click.handle(body);
  }

  @Post("payme")
  async paymeCallback(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: Record<string, unknown>
  ) {
    if (!this.payme.authorize(authorization)) {
      return { jsonrpc: "2.0", id: body.id ?? null, error: { code: -32504, message: "Unauthorized" } };
    }
    return this.payme.handle(body);
  }

  @Get("orders/:orderId")
  async orderPayments(
    @Param("orderId") orderId: string,
    @Headers("authorization") authorization: string | undefined
  ) {
    const token = authorization?.replace(/^Bearer\s+/i, "") ?? "";
    const user = await this.auth.validateSession(token);
    return this.payments.getOrderPayment(orderId, user.id);
  }
}
