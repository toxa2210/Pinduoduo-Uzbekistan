import { Injectable } from "@nestjs/common";
import { PinduoduoService, PddProduct } from "./pinduoduo.service";
import { PddAdapter } from "./pdd.adapter";
@Injectable()
export class PddApiAdapter implements PddAdapter {
 constructor(private readonly pdd:PinduoduoService){}
 searchProducts(keyword:string,page=1,limit=20):Promise<{total:number;items:PddProduct[]}>{return this.pdd.searchGoods(keyword,page,limit);}
 getProduct(externalId:string){return this.pdd.goodsDetail(externalId);}
 getCategories(parentId=0){return this.pdd.categories(parentId);}
}