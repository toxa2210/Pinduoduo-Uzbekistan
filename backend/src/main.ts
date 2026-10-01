import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.FRONTEND_URL?.split(",").map((value) => value.trim()).concat("https://uriona-frontend.onrender.com") ?? [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "https://uriona.uz",
      "https://www.uriona.uz",
      "https://uriona-frontend.onrender.com"
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

  const port = Number(process.env.PORT ?? process.env.APP_PORT ?? 8000);
  await app.listen(port);

  console.log(`Uriona API running on http://localhost:${port}/api/v1`);
}

bootstrap();
