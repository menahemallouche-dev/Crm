import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ContactsService } from "./contacts.service";
import { CreateContactDto, QueryContactsDto, UpdateContactDto } from "./dto/contact.dto";

@ApiTags("contacts")
@Controller("contacts")
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  create(@Body() dto: CreateContactDto) {
    return this.contactsService.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryContactsDto) {
    return this.contactsService.findAll(query);
  }

  @Get("birthdays/upcoming")
  upcomingBirthdays() {
    return this.contactsService.upcomingBirthdays();
  }

  /** Contacts who open the mailings sent to them, ranked by engagement — the shortlist to call first. */
  @Get("engaged")
  engaged(@Query("limit") limit?: string) {
    return this.contactsService.engagedContacts(limit ? Number(limit) : undefined);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.contactsService.findOne(id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateContactDto) {
    return this.contactsService.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.contactsService.remove(id);
  }

  @Post(":id/reclassify")
  reclassify(@Param("id") id: string) {
    return this.contactsService.reclassify(id);
  }
}
