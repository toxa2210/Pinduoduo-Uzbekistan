import { Controller, Get, Query } from "@nestjs/common";
import { AliexpressService } from "./aliexpress.service";

@Controller("integrations/aliexpress")
export class AliexpressController {
  constructor(private readonly aliexpress: AliexpressService) {}

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
