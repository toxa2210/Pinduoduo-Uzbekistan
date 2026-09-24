import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import { PinduoduoService } from "./pinduoduo.service";

@Controller("integrations/pinduoduo")
export class PinduoduoController {
  constructor(private readonly pdd:PinduoduoService) {}
  @Get("status") status(){return this.pdd.status();}
  @Get("integrations/pdd/status") aliasStatus() { return this.pdd.status(); }

  @Get("goods/search") search(@Query("keyword") keyword?:string,@Query("page") page="1",@Query("page_size") pageSize="20"){
    if(!keyword?.trim()) throw new BadRequestException({code:"KEYWORD_REQUIRED",message:"keyword is required"});
    return this.pdd.searchGoods(keyword.trim(),Number(page),Number(pageSize));
  }
  @Get("goods/detail") detail(@Query("goods_id") goodsId?:string){
    if(!goodsId?.trim()) throw new BadRequestException({code:"GOODS_ID_REQUIRED",message:"goods_id is required"});
    return this.pdd.goodsDetail(goodsId.trim());
  }
  @Get("categories") categories(@Query("parent_cat_id") parentCatId="0"){return this.pdd.categories(Number(parentCatId));}
}