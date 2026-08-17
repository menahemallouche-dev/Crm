import { Module } from "@nestjs/common";
import { OpenAiService } from "./openai.service";
import { ScoringService } from "./scoring.service";
import { AssistantService } from "./assistant.service";
import { AssistantController } from "./assistant.controller";

@Module({
  providers: [OpenAiService, ScoringService, AssistantService],
  controllers: [AssistantController],
  exports: [OpenAiService, ScoringService, AssistantService],
})
export class AiModule {}
