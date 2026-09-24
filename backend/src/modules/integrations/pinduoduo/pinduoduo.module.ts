import { Module } from "@nestjs/common";
import { PinduoduoController } from "./pinduoduo.controller";
import { PinduoduoService } from "./pinduoduo.service";

@Module({
  controllers: [PinduoduoController],
  providers: [PinduoduoService],
  exports: [PinduoduoService]
})
export class PinduoduoModule {}
