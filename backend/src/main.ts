import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix("api/v1");

  const port = Number(process.env.APP_PORT ?? 8000);
  await app.listen(port);

  console.log(`Pinduoduo Uzbekistan API running on http://localhost:${port}/api/v1`);
}

bootstrap();
