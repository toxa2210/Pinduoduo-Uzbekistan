import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.FRONTEND_URL?.split(",").map((value) => value.trim()) ?? [
      "http://localhost:5173",
      "http://127.0.0.1:5173"
    ],
    credentials: true
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true
    })
  );

  app.setGlobalPrefix("api/v1");

  const port = Number(process.env.APP_PORT ?? 8000);
  await app.listen(port);

  console.log(`Pinduoduo Uzbekistan API running on http://localhost:${port}/api/v1`);
}

bootstrap();
