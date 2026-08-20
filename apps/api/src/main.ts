import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  // rawBody: true preserves the exact request bytes on req.rawBody, needed to
  // verify inbound webhook HMAC signatures (see webhooks/webhook-receiver.controller.ts).
  const app = await NestFactory.create(AppModule, { cors: true, rawBody: true });

  app.use(helmet());
  app.setGlobalPrefix("api");
  app.enableCors({
    origin: process.env.APP_URL ?? "http://localhost:3000",
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Gecodis CRM API")
    .setDescription(
      "API du CRM B2B nouvelle génération pour la logistique, le transport et l'immobilier logistique.",
    )
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document);

  const port = process.env.API_PORT ?? 4000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`🚀 Gecodis CRM API running on http://localhost:${port}/api`);
  // eslint-disable-next-line no-console
  console.log(`📚 Swagger docs on http://localhost:${port}/api/docs`);
}

bootstrap();
