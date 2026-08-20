import { Controller, Get, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { SearchService } from "./search.service";
import { Roles } from "../common/decorators/roles.decorator";

@ApiTags("search")
@Controller("search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(@Query("q") q: string) {
    return this.searchService.globalSearch(q ?? "");
  }

  @Roles(UserRole.ADMIN)
  @Post("reindex")
  reindex() {
    return this.searchService.reindexAll();
  }
}
