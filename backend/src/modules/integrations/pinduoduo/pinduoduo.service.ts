import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash } from "node:crypto";

@Injectable()
export class PinduoduoService {
  private readonly gateway = "https://gw-api.pinduoduo.com/api/router";

  constructor(private readonly config: ConfigService) {}

  private sign(params: Record<string, unknown>): string {
    const secret = this.config.get<string>("PDD_CLIENT_SECRET");
    if (!secret) throw new ServiceUnavailableException("Pinduoduo credentials are not configured");

    const payload = Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null && value !== "")
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}${typeof value === "object" ? JSON.stringify(value) : String(value)}`)
      .join("");

    return createHash("md5").update(secret + payload + secret).digest("hex").toUpperCase();
  }

  async call(type: string, params: Record<string, unknown> = {}) {
    const clientId = this.config.get<string>("PDD_CLIENT_ID");
    if (!clientId) throw new ServiceUnavailableException("Pinduoduo credentials are not configured");

    const body: Record<string, unknown> = {
      ...params,
      type,
      client_id: clientId,
      timestamp: Math.floor(Date.now() / 1000),
      data_type: "JSON"
    };

    const token = this.config.get<string>("PDD_ACCESS_TOKEN");
    if (token) body.access_token = token;
    body.sign = this.sign(body);

    const response = await fetch(this.gateway, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(
        Object.entries(body).reduce<Record<string, string>>((acc, [key, value]) => {
          acc[key] = typeof value === "object" ? JSON.stringify(value) : String(value);
          return acc;
        }, {})
      )
    });

    const data = await response.json() as Record<string, unknown>;
    if (!response.ok || data.error_response) {
      throw new ServiceUnavailableException({ provider: "pinduoduo", response: data });
    }
    return data;
  }

  searchGoods(keyword: string, page = 1, pageSize = 20) {
    return this.call("pdd.ddk.goods.search", { keyword, page, page_size: pageSize });
  }

  goodsDetail(goodsId: string) {
    return this.call("pdd.ddk.goods.detail", { goods_id_list: JSON.stringify([goodsId]) });
  }

  categories(parentCatId = 0) {
    return this.call("pdd.goods.cats.get", { parent_cat_id: parentCatId });
  }

  mallGoodsList(mallId: string, page = 1, pageSize = 20) {
    return this.call("pdd.ddk.mall.goods.list.get", { mall_id: mallId, page, page_size: pageSize });
  }
}
