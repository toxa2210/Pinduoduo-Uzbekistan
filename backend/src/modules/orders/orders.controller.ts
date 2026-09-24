import { Body,Controller,Get,Headers,Param,Post } from "@nestjs/common";
import { IsArray,IsInt,IsNotEmpty,IsOptional,IsString,Max,Min,ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { OrdersService } from "./orders.service";
import { AuthService } from "../auth/auth.service";
class ItemDto{@IsString() @IsNotEmpty() productId!:string;@IsInt() @Min(1) @Max(999) quantity!:number;}
class CreateOrderDto{@IsString() @IsNotEmpty() deliveryAddress!:string;@IsArray() @IsOptional() @ValidateNested({each:true}) @Type(()=>ItemDto) items?:ItemDto[];}
@Controller("orders")
export class OrdersController {
 constructor(private readonly orders:OrdersService,private readonly auth:AuthService){}
 private token(v?:string){return v?.replace(/^Bearer\s+/i,"")??"";}
 @Post() async create(@Headers("authorization") a:string|undefined,@Headers("idempotency-key") key:string|undefined,@Body() body:CreateOrderDto){const u=await this.auth.validateSession(this.token(a));return this.orders.create({userId:u.id,deliveryAddress:body.deliveryAddress,items:body.items?.length?body.items:undefined,idempotencyKey:key});}
 @Get() async list(@Headers("authorization") a:string|undefined){const u=await this.auth.validateSession(this.token(a));return this.orders.listForUser(u.id);}
 @Get(":id") async get(@Headers("authorization") a:string|undefined,@Param("id") id:string){const u=await this.auth.validateSession(this.token(a));return this.orders.getForUser(id,u.id);}
}