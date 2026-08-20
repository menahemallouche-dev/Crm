import { Module } from "@nestjs/common";
import { QueueModule } from "../queue/queue.module";
import { AiModule } from "../ai/ai.module";
import { SearchModule } from "../search/search.module";
import { EnrichmentService } from "./enrichment.service";
import { EnrichmentProcessor } from "./enrichment.processor";
import { InseeSireneProvider } from "./providers/insee-sirene.provider";
import { PappersProvider } from "./providers/pappers.provider";
import { GooglePlacesProvider } from "./providers/google-places.provider";
import { LinkedInProvider } from "./providers/linkedin.provider";
import { DemoFallbackProvider } from "./providers/demo-fallback.provider";

@Module({
  imports: [QueueModule, AiModule, SearchModule],
  providers: [
    EnrichmentService,
    EnrichmentProcessor,
    InseeSireneProvider,
    PappersProvider,
    GooglePlacesProvider,
    LinkedInProvider,
    DemoFallbackProvider,
  ],
  exports: [EnrichmentService],
})
export class EnrichmentModule {}
