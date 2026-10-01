import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac } from "node:crypto";

@Injectable()
export class AliexpressService {
  private readonly gateway: string;

  constructor(private readonly config: ConfigService) {
    this.gateway = this.config.get<string>("ALIEXPRESS_API_URL") ?? "https://api-sg.aliexpress.com/sync";
  }

  private sign(params: Record<string, string>): string {
    const secret = this.config.get<string>("ALIEXPRESS_APP_SECRET");
    if (!secret) throw new ServiceUnavailableException("AliExpress credentials are not configured");
    const path = params.method ?? "";
    const payload = Object.entries(params)
      .filter(([key, value]) => key !== "sign" && value !== undefined && value !== null && value !== "")
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}${value}`)
      .join("");
    return createHmac("sha256", secret).update(path + payload).digest("hex").toUpperCase();
  }

  async call(method: string, params: Record<string, unknown> = {}) {
    const appKey = this.config.get<string>("ALIEXPRESS_APP_KEY");
    if (!appKey) throw new ServiceUnavailableException("AliExpress credentials are not configured");

    const body: Record<string, string> = {
      app_key: appKey,
      method,
      timestamp: String(Date.now()),
      sign_method: "sha256",
      format: "json",
      v: "2.0",
      ...Object.entries(params).reduce<Record<string, string>>((result, [key, value]) => {
        result[key] = typeof value === "object" ? JSON.stringify(value) : String(value);
        return result;
      }, {})
    };
    const token = this.config.get<string>("ALIEXPRESS_ACCESS_TOKEN");
    if (token) body.access_token = token;
    body.sign = this.sign(body);

    const response = await fetch(this.gateway, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded;charset=utf-8" },
      body: new URLSearchParams(body)
    });
    const data = await response.json() as Record<string, unknown>;
    if (!response.ok || data.error_response || data.error_code) {
      throw new ServiceUnavailableException({ provider: "aliexpress", response: data });
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
