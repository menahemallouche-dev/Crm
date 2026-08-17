import { Module } from "@nestjs/common";
import { RealEstateService } from "./real-estate.service";
import { RealEstateController } from "./real-estate.controller";

@Module({
  providers: [RealEstateService],
  controllers: [RealEstateController],
  exports: [RealEstateService],
})
export class RealEstateModule {}
