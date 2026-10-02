import { Controller, Get, Param, Query } from "@nestjs/common";
import { AliexpressService } from "./aliexpress.service";

@Controller("integrations/aliexpress")
export class AliexpressController {
  constructor(private readonly aliexpress: AliexpressService) {}

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
