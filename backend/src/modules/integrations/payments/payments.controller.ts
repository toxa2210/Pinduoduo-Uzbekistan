import { Body, Controller, Headers, Post } from "@nestjs/common";
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
    return this.click.handle(body);
  }

  @Post("payme")
  async payme(@Headers("authorization") authorization: string | undefined, @Body() body: Record<string, unknown>) {
    if (!this.payme.authorize(authorization)) {
      return { jsonrpc: "2.0", id: body.id ?? null, error: { code: -32504, message: "Unauthorized" } };
    }
    return this.payme.handle(body);
  }
}
