import { Injectable } from "@nestjs/common";
@Injectable()
export class CurrencyService {
 private readonly rates:Record<string,number>={CNY_UZS:Number(process.env.CNY_UZS_RATE||0)};
 getRate(from:string,to:string){if(from===to)return 1;const key=from.toUpperCase()+"_"+to.toUpperCase();const rate=this.rates[key];if(!rate)throw new Error("Currency rate "+key+" is not configured");return rate;}
 convert(amountMinor:number,from:string,to:string){return Math.round(amountMinor*this.getRate(from,to));}
}