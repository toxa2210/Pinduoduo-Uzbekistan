import { Body, Controller, Headers, Post, UnauthorizedException } from "@nestjs/common";
import { ClickService } from "./click.service";
import { PaymeService } from "./payme.service";

@Controller("payments")
export class PaymentsController {
  constructor(
    private readonly click: ClickService,
    private readonly payme: PaymeService
  ) {}

  @Post("click/callback")
  clickCallback(@Body() body: Record<string, unknown>) {
    if (!this.click.verifyPrepare(body)) throw new UnauthorizedException("Invalid Click signature");
    return { error: 0, click_trans_id: body.click_trans_id, merchant_trans_id: body.merchant_trans_id };
  }

  @Post("payme")
  payme(@Headers("authorization") authorization: string | undefined, @Body() body: Record<string, unknown>) {
    if (!this.payme.authorize(authorization)) {
      return { jsonrpc: "2.0", id: body.id ?? null, error: { code: -32504, message: "Unauthorized" } };
    }

    return {
      jsonrpc: "2.0",
      id: body.id ?? null,
      result: {
        method: body.method,
        merchant_id: this.payme.merchantId(),
        transaction_id: this.payme.transactionId((body.params ?? {}) as Record<string, unknown>)
      }
    };
  }
}
