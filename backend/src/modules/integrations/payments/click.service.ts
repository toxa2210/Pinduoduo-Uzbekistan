import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash } from "node:crypto";

@Injectable()
export class ClickService {
  constructor(private readonly config: ConfigService) {}

  private md5(value: string) {
    return createHash("md5").update(value).digest("hex");
  }

  verifyPrepare(body: Record<string, unknown>) {
    const secret = this.config.get<string>("CLICK_SECRET_KEY");
    if (!secret) throw new ServiceUnavailableException("Click credentials are not configured");

    const expected = this.md5(
      `${body.click_trans_id}${body.service_id}${body.merchant_trans_id}${body.amount}${body.action}${body.sign_time}${secret}`
    );

    return expected === body.sign_string;
  }

  verifyComplete(body: Record<string, unknown>) {
    return this.verifyPrepare(body);
  }
}
