import { Body, Controller, Headers, HttpCode, Post, UnauthorizedException } from "@nestjs/common";
import { PaynetService } from "./paynet.service";

@Controller("payments/paynet")
export class PaynetController {
  constructor(private readonly paynet: PaynetService) {}

  @Post("uws")
  @HttpCode(200)
  async uws(@Headers("authorization") authorization: string | undefined, @Body() body: any) {
    if (!this.paynet.authorize(authorization)) throw new UnauthorizedException();
    return this.paynet.handle(body);
  }
}
