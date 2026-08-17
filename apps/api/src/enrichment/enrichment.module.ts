import { Module } from "@nestjs/common";
import { QueueModule } from "../queue/queue.module";
import { AiModule } from "../ai/ai.module";
import { EnrichmentService } from "./enrichment.service";
import { EnrichmentProcessor } from "./enrichment.processor";
import { InseeSireneProvider } from "./providers/insee-sirene.provider";
import { PappersProvider } from "./providers/pappers.provider";
import { GooglePlacesProvider } from "./providers/google-places.provider";
import { DemoFallbackProvider } from "./providers/demo-fallback.provider";

@Module({
  imports: [QueueModule, AiModule],
  providers: [
    EnrichmentService,
    EnrichmentProcessor,
    InseeSireneProvider,
    PappersProvider,
    GooglePlacesProvider,
    DemoFallbackProvider,
  ],
  exports: [EnrichmentService],
})
export class EnrichmentModule {}
