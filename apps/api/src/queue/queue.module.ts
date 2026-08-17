import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ConfigModule, ConfigService } from "@nestjs/config";

export const QUEUE_ENRICHMENT = "enrichment";
export const QUEUE_SCORING = "scoring";
export const QUEUE_REMINDERS = "reminders";
export const QUEUE_CAMPAIGNS = "campaigns";

/**
 * Central BullMQ wiring backed by Redis. All background automation
 * (enrichment lookups, AI scoring refresh, reminder/relance emails,
 * campaign sends) flows through these queues so it can be retried,
 * rate-limited and observed independently of the request/response cycle.
 *
 * Requires REDIS_URL (see docker-compose.yml `redis` service). If Redis is
 * unreachable, job producers below catch the error and fall back to an
 * inline synchronous call so the app keeps working in a minimal dev setup.
 */
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = new URL(config.get<string>("REDIS_URL") ?? "redis://localhost:6379");
        return {
          connection: {
            host: url.hostname,
            port: Number(url.port || 6379),
            maxRetriesPerRequest: null,
          },
        };
      },
    }),
    BullModule.registerQueue(
      { name: QUEUE_ENRICHMENT },
      { name: QUEUE_SCORING },
      { name: QUEUE_REMINDERS },
      { name: QUEUE_CAMPAIGNS },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
