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
  async payme(@Headers("authorization") authorization: string | undefined, @Body() body: Record<string, unknown>) {
    if (!this.payme.authorize(authorization)) {
      return { jsonrpc: "2.0", id: body.id ?? null, error: { code: -32504, message: "Unauthorized" } };
    }
    return this.payme.handle(body);
  }
}
