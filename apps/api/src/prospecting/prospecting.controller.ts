import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ProspectingService } from "./prospecting.service";
import { ImportProspectDto, SearchProspectsDto } from "./dto/prospecting.dto";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/types";

/** "Chasse commerciale" — recherche manuelle de prospects par secteur/métier. Jamais automatique : une recherche = une action explicite de l'utilisateur. */
@ApiTags("prospecting")
@Controller("prospecting")
export class ProspectingController {
  constructor(private readonly prospectingService: ProspectingService) {}

  @Get("search")
  search(@Query() query: SearchProspectsDto) {
    return this.prospectingService.search(query);
  }

  @Post("import")
  import(@Body() dto: ImportProspectDto, @CurrentUser() user: AuthenticatedUser) {
    return this.prospectingService.importAsCompany(dto, user?.id);
  }
}
