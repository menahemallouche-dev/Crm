import { Module } from "@nestjs/common";
import { SearchService } from "./search.service";
import { SearchController } from "./search.controller";
import { ElasticsearchService } from "./elasticsearch.service";

@Module({
  providers: [SearchService, ElasticsearchService],
  controllers: [SearchController],
  exports: [ElasticsearchService],
})
export class SearchModule {}
