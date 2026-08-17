import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { IsString } from "class-validator";
import { AssistantService } from "./assistant.service";

class AskDto {
  @IsString()
  question: string;
}

@ApiTags("ai-assistant")
@Controller("ai/assistant")
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Post("ask")
  ask(@Body() dto: AskDto) {
    return this.assistantService.ask(dto.question);
  }

  @Get("capabilities")
  capabilities() {
    return this.assistantService.listCapabilities();
  }
}
