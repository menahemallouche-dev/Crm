import { Module } from "@nestjs/common";
import { ContactsService } from "./contacts.service";
import { ContactsController } from "./contacts.controller";
import { AiModule } from "../ai/ai.module";
import { SearchModule } from "../search/search.module";

@Module({
  imports: [AiModule, SearchModule],
  providers: [ContactsService],
  controllers: [ContactsController],
  exports: [ContactsService],
})
export class ContactsModule {}
