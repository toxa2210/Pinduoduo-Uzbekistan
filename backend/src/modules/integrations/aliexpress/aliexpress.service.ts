import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac } from "node:crypto";

@Injectable()
export class AliexpressService {
  private readonly gateway: string;
  private readonly timeoutMs = 15_000;

  constructor(private readonly config: ConfigService) {
    this.gateway = this.config.get<string>("ALIEXPRESS_API_URL") ?? "https://api-sg.aliexpress.com/sync";
  }

  private sign(params: Record<string, string>): string {
    const secret = this.config.get<string>("ALIEXPRESS_APP_SECRET");
    if (!secret) throw new ServiceUnavailableException("AliExpress credentials are not configured");
    const path = params.method?.includes("/") ? params.method : "";
    const signedParams = { ...params };
    if (path) delete signedParams.method;
    const payload = Object.entries(signedParams)
      .filter(([key, value]) => key !== "sign" && value !== undefined && value !== null && value !== "")
      .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
      .map(([key, value]) => `${key}${value}`)
      .join("");
    return createHmac("sha256", secret).update(path + payload).digest("hex").toUpperCase();
  }

  async call(method: string, params: Record<string, unknown> = {}) {
    const appKey = this.config.get<string>("ALIEXPRESS_APP_KEY");
    if (!appKey) throw new ServiceUnavailableException("AliExpress credentials are not configured");

    const reserved = new Set(["app_key", "method", "timestamp", "sign_method", "format", "v", "access_token", "sign"]);
    const body: Record<string, string> = {
      app_key: appKey,
      method,
      timestamp: new Date().toISOString().replace("T", " ").slice(0, 19),
      sign_method: "sha256",
      format: "json",
      v: "2.0",
      ...Object.entries(params).reduce<Record<string, string>>((result, [key, value]) => {
        if (reserved.has(key) || value === undefined || value === null || value === "") return result;
        result[key] = typeof value === "object" ? JSON.stringify(value) : String(value);
        return result;
      }, {})
    };
    const token = this.config.get<string>("ALIEXPRESS_ACCESS_TOKEN");
    if (token) body.access_token = token;
    body.sign = this.sign(body);

    let response: Response;
    try {
      response = await fetch(this.gateway, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded;charset=utf-8" },
        body: new URLSearchParams(body),
        signal: AbortSignal.timeout(this.timeoutMs)
      });
    } catch {
      throw new ServiceUnavailableException("AliExpress API could not be reached");
    }

    let data: Record<string, unknown>;
    try {
      data = await response.json() as Record<string, unknown>;
    } catch {
      throw new ServiceUnavailableException("AliExpress API returned an invalid response");
    }
    if (!response.ok || data.error_response || data.error_code) {
      const error = data.error_response && typeof data.error_response === "object"
        ? data.error_response as Record<string, unknown>
        : data;
      const code = error.code ?? error.error_code;
      const message = error.msg ?? error.message ?? error.error_message;
      throw new ServiceUnavailableException({
        provider: "aliexpress",
        code: code ? String(code) : undefined,
        message: message ? String(message) : "AliExpress request failed"
      });
    }
    return data;
  }

  hotProducts(params: Record<string, unknown> = {}) {
    return this.call("aliexpress.affiliate.hotproduct.query", params);
  }

  affiliateCategories(params: Record<string, unknown> = {}) {
    return this.call("aliexpress.affiliate.category.get", params);
  }

  generateAffiliateLinks(params: Record<string, unknown>) {
    return this.call("aliexpress.affiliate.link.generate", params);
  }

  affiliateOrders(params: Record<string, unknown> = {}) {
    return this.call("aliexpress.affiliate.order.list", params);
  }

  affiliateOrderDetail(params: Record<string, unknown>) {
    return this.call("aliexpress.affiliate.order.get", params);
  }
}
