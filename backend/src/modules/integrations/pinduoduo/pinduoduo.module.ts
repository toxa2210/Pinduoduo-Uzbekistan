import { Module } from "@nestjs/common";
import { PinduoduoController } from "./pinduoduo.controller";
import { PinduoduoService } from "./pinduoduo.service";
import { PddApiAdapter } from "./pdd-api.adapter";
import { MockPddAdapter } from "./mock-pdd.adapter";
import { PddStatusController } from "./pdd-status.controller";
@Module({controllers:[PinduoduoController,PddStatusController],providers:[PinduoduoService,PddApiAdapter,MockPddAdapter],exports:[PinduoduoService,PddApiAdapter]})
export class PinduoduoModule {}