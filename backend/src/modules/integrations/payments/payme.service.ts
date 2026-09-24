import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash } from "node:crypto";

@Injectable()
export class PaymeService {
  constructor(private readonly config: ConfigService) {}

  private getKey() {
    return this.config.get<string>("PAYME_MERCHANT_KEY") ?? "";
  }

  private parseAuth(header?: string) {
    if (!header?.startsWith("Basic ")) return "";
    return Buffer.from(header.slice(6), "base64").toString("utf8").split(":")[1] ?? "";
  }

  authorize(header?: string) {
    return this.parseAuth(header) === this.getKey();
  }

  merchantId() {
    return this.config.get<string>("PAYME_MERCHANT_ID") ?? "";
  }

  transactionId(payload: Record<string, unknown>) {
    return createHash("sha256")
      .update(`${payload.id ?? ""}:${payload.time ?? ""}:${this.getKey()}`)
      .digest("hex");
  }
}
