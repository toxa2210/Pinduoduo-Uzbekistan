import { Injectable, ServiceUnavailableException, BadGatewayException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash } from "node:crypto";

export type PddProduct = {
  id: string; title: string; description: string | null; priceCnyMinor: number | null;
  imageUrl: string | null; thumbnailUrl: string | null; sales: number | null;
  goodsSign: string | null; raw: Record<string, unknown>;
};

@Injectable()
export class PinduoduoService {
  private readonly defaultGateway = "https://open-api.pinduoduo.com/api/router";
  constructor(private readonly config: ConfigService) {}
  private get gateway() { return this.config.get<string>("PDD_API_URL") || this.defaultGateway; }
  isConfigured() { return Boolean(this.config.get<string>("PDD_CLIENT_ID") && this.config.get<string>("PDD_CLIENT_SECRET")); }
  status() { return { provider:"pinduoduo", configured:this.isConfigured(), gateway:this.gateway, accessTokenConfigured:Boolean(this.config.get<string>("PDD_ACCESS_TOKEN")) }; }

  private sign(params: Record<string, unknown>): string {
    const secret=this.config.get<string>("PDD_CLIENT_SECRET");
    if(!secret) throw new ServiceUnavailableException({code:"PDD_NOT_CONFIGURED",message:"Pinduoduo credentials are not configured on the backend"});
    const payload=Object.entries(params).filter(([key,value])=>key!=="sign"&&value!==undefined&&value!==null&&value!=="").sort(([a],[b])=>a.localeCompare(b)).map(([key,value])=>`${key}${typeof value==="object"?JSON.stringify(value):String(value)}`).join("");
    return createHash("md5").update(secret+payload+secret).digest("hex").toUpperCase();
  }

  async call(type:string,params:Record<string,unknown>={}) {
    const clientId=this.config.get<string>("PDD_CLIENT_ID");
    if(!clientId) throw new ServiceUnavailableException({code:"PDD_NOT_CONFIGURED",message:"Pinduoduo credentials are not configured on the backend"});
    const body:Record<string,unknown>={...params,type,client_id:clientId,timestamp:Math.floor(Date.now()/1000),data_type:"JSON"};
    const token=this.config.get<string>("PDD_ACCESS_TOKEN"); if(token) body.access_token=token; body.sign=this.sign(body);
    let response:Response;
    try { response=await fetch(this.gateway,{signal:AbortSignal.timeout(10_000),method:"POST",headers:{"content-type":"application/x-www-form-urlencoded;charset=UTF-8"},body:new URLSearchParams(Object.entries(body).reduce<Record<string,string>>((acc,[key,value])=>{acc[key]=typeof value==="object"?JSON.stringify(value):String(value);return acc;},{}))}); }
    catch(error) { throw new BadGatewayException({code:"PDD_NETWORK_ERROR",message:"Pinduoduo gateway could not be reached",cause:error instanceof Error?error.message:String(error)}); }
    let data:Record<string,unknown>; try { data=await response.json() as Record<string,unknown>; } catch { throw new BadGatewayException({code:"PDD_INVALID_RESPONSE",message:"Pinduoduo returned a non-JSON response"}); }
    if(!response.ok||data.error_response) throw new BadGatewayException({code:"PDD_PROVIDER_ERROR",httpStatus:response.status,response:data});
    return data;
  }

  async searchGoods(keyword:string,page=1,pageSize=20) {
    const data=await this.call("pdd.ddk.goods.search",{keyword,page,page_size:Math.min(Math.max(pageSize,1),100)});
    const response=(data.goods_search_response||{}) as Record<string,unknown>; const list=Array.isArray(response.goods_list)?response.goods_list:[];
    return {source:"pinduoduo",page,pageSize,total:Number(response.total||0),items:list.map(item=>this.normalizeProduct(item as Record<string,unknown>))};
  }
  async goodsDetail(goodsId:string) {
    const data=await this.call("pdd.ddk.goods.detail",{goods_id_list:JSON.stringify([goodsId])});
    const response=(data.goods_detail_response||{}) as Record<string,unknown>; const list=Array.isArray(response.goods_detail_list)?response.goods_detail_list:[];
    return list[0]?this.normalizeProduct(list[0] as Record<string,unknown>):null;
  }
  async categories(parentCatId=0) { return this.call("pdd.goods.cats.get",{parent_cat_id:parentCatId}); }
  private normalizeProduct(item:Record<string,unknown>):PddProduct {
    const price=Number(item.min_group_price??item.min_normal_price??NaN);
    return {id:String(item.goods_id??item.goods_sign??""),title:String(item.goods_name??"Без названия"),description:item.goods_desc?String(item.goods_desc):null,priceCnyMinor:Number.isFinite(price)?Math.round(price):null,imageUrl:item.goods_image_url?String(item.goods_image_url):null,thumbnailUrl:item.goods_thumbnail_url?String(item.goods_thumbnail_url):null,sales:item.sales!==undefined?Number(item.sales):null,goodsSign:item.goods_sign?String(item.goods_sign):null,raw:item};
  }
}