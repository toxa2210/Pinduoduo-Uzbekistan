import {
  BadGatewayException,
  BadRequestException,
  Controller,
  Get,
  GatewayTimeoutException,
  Header,
  Headers,
  Param,
  Post,
  Query,
  StreamableFile
} from "@nestjs/common";
import { AliexpressService } from "./aliexpress.service";

const IMAGE_HOSTS = ["alicdn.com", "aliexpress-media.com"];
const IMAGE_CONTENT_TYPES = new Set(["image/avif", "image/gif", "image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

@Controller("integrations/aliexpress")
export class AliexpressController {
  constructor(private readonly aliexpress: AliexpressService) {}

  @Get("image")
  @Header("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800")
  @Header("X-Content-Type-Options", "nosniff")
  async productImage(@Query("url") imageUrl?: string): Promise<StreamableFile> {
    if (!imageUrl || imageUrl.length > 2048) {
      throw new BadRequestException("A valid image URL is required");
    }

    let target: URL;
    try {
      target = new URL(imageUrl);
    } catch {
      throw new BadRequestException("A valid image URL is required");
    }

    if (!this.isAllowedImageUrl(target)) {
      throw new BadRequestException("Image host is not allowed");
    }

    let upstream: Response;
    for (let redirects = 0; redirects <= 3; redirects += 1) {
      try {
        upstream = await fetch(target, {
          headers: { Accept: "image/avif,image/webp,image/png,image/jpeg,image/gif" },
          redirect: "manual",
          signal: AbortSignal.timeout(8000)
        });
      } catch {
        throw new GatewayTimeoutException("Image provider did not respond");
      }

      if (upstream.status < 300 || upstream.status >= 400) break;
      const location = upstream.headers.get("location");
      if (!location || redirects === 3) {
        throw new BadGatewayException("Image provider returned an invalid redirect");
      }
      target = new URL(location, target);
      if (!this.isAllowedImageUrl(target)) {
        throw new BadRequestException("Image redirect host is not allowed");
      }
    }

    if (!upstream.ok) {
      throw new BadGatewayException("Image provider returned an error");
    }
    const contentType = upstream.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
    if (!contentType || !IMAGE_CONTENT_TYPES.has(contentType) || !upstream.body) {
      throw new BadGatewayException("Image provider returned an unsupported image");
    }

    const reader = upstream.body.getReader();
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_IMAGE_BYTES) {
        await reader.cancel();
        throw new BadGatewayException("Image exceeds the maximum allowed size");
      }
      chunks.push(Buffer.from(value));
    }

    const image = Buffer.concat(chunks, totalBytes);
    return new StreamableFile(image, {
      type: contentType,
      disposition: "inline",
      length: image.byteLength
    });
  }

  private isAllowedImageUrl(url: URL): boolean {
    return url.protocol === "https:"
      && !url.username
      && !url.password
      && !url.port
      && IMAGE_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
  }

  @Post("oauth/start")
  async startOAuth(@Headers("x-aliexpress-setup-secret") setupSecret?: string) {
    this.aliexpress.validateSetupSecret(setupSecret);
    return { authorizationUrl: await this.aliexpress.createAuthorizationUrl() };
  }

  @Get("oauth/callback")
  async oauthCallback(
    @Query("code") code?: string,
    @Query("state") state?: string,
    @Query("error") error?: string
  ) {
    if (error) throw new BadRequestException("AliExpress authorization was declined");
    if (!code || !state) throw new BadRequestException("AliExpress callback is missing code or state");
    await this.aliexpress.completeAuthorization(code, state);
    return { success: true, message: "AliExpress is connected. Tokens were saved securely on the backend." };
  }

  @Get("product/:productId")
  productDetails(
    @Param("productId") productId: string,
    @Query("ship_to_country") shipToCountry?: string,
    @Query("target_currency") targetCurrency?: string,
    @Query("target_language") targetLanguage?: string
  ) {
    return this.aliexpress.productDetails(productId, {
      ...(shipToCountry ? { ship_to_country: shipToCountry } : {}),
      ...(targetCurrency ? { target_currency: targetCurrency } : {}),
      ...(targetLanguage ? { target_language: targetLanguage } : {})
    });
  }

  @Get("dropshipping/recommendations")
  dropshippingRecommendations() {
    return this.aliexpress.dropshippingRecommendations();
  }

  @Get("dropshipping/categories")
  dropshippingCategories(
    @Query("categoryId") categoryId?: string,
    @Query("language") language?: string
  ) {
    return this.aliexpress.dropshippingCategories(categoryId, language);
  }

  @Get("dropshipping/products")
  dropshippingProducts(
    @Query("keyWord") keyWord?: string,
    @Query("categoryId") categoryId?: string,
    @Query("pageIndex") pageIndex?: string,
    @Query("pageSize") pageSize?: string,
    @Query("sortBy") sortBy?: string,
    @Query("currency") currency?: string,
    @Query("countryCode") countryCode?: string
  ) {
    return this.aliexpress.dropshippingProducts({
      keyWord,
      categoryId,
      pageIndex,
      pageSize,
      sortBy,
      currency,
      countryCode
    });
  }

  @Get("affiliate/products")
  hotProducts(@Query() params: Record<string, string>) {
    return this.aliexpress.hotProducts(params);
  }

  @Get("affiliate/categories")
  categories(@Query() params: Record<string, string>) {
    return this.aliexpress.affiliateCategories(params);
  }

  @Get("affiliate/links")
  links(@Query() params: Record<string, string>) {
    return this.aliexpress.generateAffiliateLinks(params);
  }

  @Get("affiliate/orders")
  orders(@Query() params: Record<string, string>) {
    return this.aliexpress.affiliateOrders(params);
  }

  @Get("affiliate/orders/detail")
  orderDetail(@Query() params: Record<string, string>) {
    return this.aliexpress.affiliateOrderDetail(params);
  }
}
