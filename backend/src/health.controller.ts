import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "./database/prisma.service";
import { PinduoduoService } from "./modules/integrations/pinduoduo/pinduoduo.service";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma:PrismaService,private readonly pdd:PinduoduoService) {}
  @Get() async check(){
    let database:"ok"|"error"="ok";
    try{await this.prisma.$queryRawUnsafe("SELECT 1");}catch{database="error";}
    return {status:database==="ok"?"ok":"degraded",service:"pinduoduo-uz-backend",timestamp:new Date().toISOString(),database,integrations:{pinduoduo:this.pdd.status()}};
  }
}