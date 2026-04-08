import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS (adjust origin later)
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown fields
      forbidNonWhitelisted: true, // throw if unknown field sent
      transform: true, // auto-transform DTO types
    }),
  );

  const PORT = process.env.APP_PORT || 3000;
  await app.listen(PORT, process.env.APP_HOST ?? '0.0.0.0');

  console.log(`Server is running on ${process.env.APP_HOST}:${PORT}`);
}

bootstrap();
