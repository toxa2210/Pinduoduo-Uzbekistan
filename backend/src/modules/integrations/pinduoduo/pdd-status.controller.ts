import { Controller, Get } from "@nestjs/common";
import { PinduoduoService } from "./pinduoduo.service";
@Controller("integrations/pdd")
export class PddStatusController { constructor(private readonly pdd:PinduoduoService){} @Get("status") status(){return this.pdd.status();} }