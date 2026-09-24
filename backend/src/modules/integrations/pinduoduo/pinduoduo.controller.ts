import { Controller, Get, Query } from "@nestjs/common";
import { PinduoduoService } from "./pinduoduo.service";

@Controller("integrations/pinduoduo")
export class PinduoduoController {
  constructor(private readonly pdd: PinduoduoService) {}

  @Get("goods/search")
  search(@Query("keyword") keyword: string, @Query("page") page = "1", @Query("page_size") pageSize = "20") {
    return this.pdd.searchGoods(keyword, Number(page), Number(pageSize));
  }

  @Get("goods/detail")
  detail(@Query("goods_id") goodsId: string) {
    return this.pdd.goodsDetail(goodsId);
  }

  @Get("categories")
  categories(@Query("parent_cat_id") parentCatId = "0") {
    return this.pdd.categories(Number(parentCatId));
  }
}
