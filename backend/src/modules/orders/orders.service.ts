import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
@Injectable()
export class OrdersService {
 constructor(private readonly prisma:PrismaService){}
 async create(input:{userId:string;deliveryAddress:string;items?:Array<{productId:string;quantity:number}>;idempotencyKey?:string}){
  if(input.idempotencyKey){const existing=await this.prisma.order.findUnique({where:{idempotencyKey:input.idempotencyKey},include:{items:true,payments:true}});if(existing&&existing.userId===input.userId)return existing;if(existing)throw new BadRequestException({code:"IDEMPOTENCY_CONFLICT",message:"Idempotency key already belongs to another user"});}
  if(!input.items){const cart=await this.prisma.cart.findUnique({where:{userId:input.userId},include:{items:true}});input.items=cart?.items.map(i=>({productId:i.productId,quantity:i.quantity}))??[];}
  if(!input.items.length)throw new BadRequestException({code:"CART_EMPTY",message:"Корзина пуста"});
  const ids=input.items.map(i=>i.productId),products=await this.prisma.product.findMany({where:{id:{in:ids},status:"ACTIVE"}});
  if(products.length!==new Set(ids).size)throw new BadRequestException({code:"PRODUCT_NOT_FOUND",message:"Один или несколько товаров недоступны"});
  const byId=new Map(products.map(p=>[p.id,p]));
  const totalMinor=input.items.reduce((sum,i)=>{if(!Number.isInteger(i.quantity)||i.quantity<1||i.quantity>999)throw new BadRequestException({code:"INVALID_QUANTITY",message:"Неверное количество"});return sum+byId.get(i.productId)!.priceMinor*i.quantity;},0);
  return this.prisma.$transaction(async(tx)=>{
   const created=await tx.order.create({data:{userId:input.userId,deliveryAddress:input.deliveryAddress,idempotencyKey:input.idempotencyKey,totalMinor,currency:"UZS",status:"AWAITING_PAYMENT",items:{create:input.items!.map(i=>({productId:i.productId,quantity:i.quantity,unitPriceMinor:byId.get(i.productId)!.priceMinor}))}},include:{items:true}});
   const cart=await tx.cart.findUnique({where:{userId:input.userId}});if(cart)await tx.cartItem.deleteMany({where:{cartId:cart.id}});
   return created;
  });
 }
 listForUser(userId:string){return this.prisma.order.findMany({where:{userId},orderBy:{createdAt:"desc"},include:{items:{include:{product:true}},payments:true}});}
 getForUser(id:string,userId:string){return this.prisma.order.findFirst({where:{id,userId},include:{items:{include:{product:true}},payments:true}});}
}