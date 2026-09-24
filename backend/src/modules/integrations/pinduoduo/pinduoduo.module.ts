import { Module } from "@nestjs/common";
import { PinduoduoController } from "./pinduoduo.controller";
import { PinduoduoService } from "./pinduoduo.service";
import { PddApiAdapter } from "./pdd-api.adapter";
import { MockPddAdapter } from "./mock-pdd.adapter";
@Module({controllers:[PinduoduoController],providers:[PinduoduoService,PddApiAdapter,MockPddAdapter],exports:[PinduoduoService,PddApiAdapter]})
export class PinduoduoModule {}