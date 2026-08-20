import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { PortalUsersService } from "./portal-users.service";
import { CreatePortalUserDto } from "./dto/portal.dto";
import { Roles } from "../common/decorators/roles.decorator";

/** Staff-facing management of a company's client-portal accounts (invite/list/deactivate). Uses the normal staff auth (global JwtAuthGuard). */
@ApiTags("portal-admin")
@Controller("companies/:companyId/portal-users")
@Roles(UserRole.ADMIN, UserRole.MANAGER)
export class PortalAdminController {
  constructor(private readonly portalUsersService: PortalUsersService) {}

  @Post()
  create(@Param("companyId") companyId: string, @Body() dto: CreatePortalUserDto) {
    return this.portalUsersService.create(companyId, dto);
  }

  @Get()
  findAll(@Param("companyId") companyId: string) {
    return this.portalUsersService.findAllForCompany(companyId);
  }

  @Patch(":id/activate")
  activate(@Param("id") id: string) {
    return this.portalUsersService.setActive(id, true);
  }

  @Patch(":id/deactivate")
  deactivate(@Param("id") id: string) {
    return this.portalUsersService.setActive(id, false);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.portalUsersService.remove(id);
  }
}
