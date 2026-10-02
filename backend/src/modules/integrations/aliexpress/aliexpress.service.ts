import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
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
    const methodResponse = Object.entries(data).find(([key, value]) =>
      key !== "error_response" && key.endsWith("_response") && value && typeof value === "object"
    )?.[1] as Record<string, unknown> | undefined;
    const nestedError = methodResponse?.error_response;
    const hasError = Boolean(data.error_response || data.error_code || nestedError || methodResponse?.error_code);
    if (!response.ok || hasError) {
      const error = data.error_response && typeof data.error_response === "object"
        ? data.error_response as Record<string, unknown>
        : nestedError && typeof nestedError === "object"
          ? nestedError as Record<string, unknown>
          : methodResponse?.error_code
            ? methodResponse
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

  productDetails(productId: string, params: Record<string, string> = {}) {
    if (!/^\d+$/.test(productId)) {
      throw new BadRequestException("productId must be a numeric AliExpress item ID");
    }
    if (params.ship_to_country && !/^[A-Z]{2}$/.test(params.ship_to_country)) {
      throw new BadRequestException("ship_to_country must be a two-letter uppercase country code");
    }
    if (params.target_currency && !/^[A-Z]{3}$/.test(params.target_currency)) {
      throw new BadRequestException("target_currency must be a three-letter uppercase currency code");
    }
    if (params.target_language && !/^[a-z]{2}(?:_[A-Z]{2})?$/.test(params.target_language)) {
      throw new BadRequestException("target_language must be a supported language code");
    }
    if (!this.config.get<string>("ALIEXPRESS_ACCESS_TOKEN")) {
      throw new ServiceUnavailableException("AliExpress DS API requires ALIEXPRESS_ACCESS_TOKEN");
    }

    return this.call("aliexpress.ds.product.get", {
      product_id: productId,
      ship_to_country: params.ship_to_country ?? "UZ",
      target_currency: params.target_currency ?? "USD",
      target_language: params.target_language ?? "ru_RU",
      remove_personal_benefit: "true"
    });
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
