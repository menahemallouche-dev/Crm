import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ContractsService } from "./contracts.service";
import { CreateContractDto, UpdateContractDto } from "./dto/contract.dto";

@ApiTags("contracts")
@Controller("contracts")
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post()
  create(@Body() dto: CreateContractDto) {
    return this.contractsService.create(dto);
  }

  @Get()
  findAll(@Query("companyId") companyId?: string) {
    return this.contractsService.findAll(companyId);
  }

  @Get("expiring-soon")
  expiringSoon() {
    return this.contractsService.expiringSoon();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.contractsService.findOne(id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateContractDto) {
    return this.contractsService.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.contractsService.remove(id);
  }
}
