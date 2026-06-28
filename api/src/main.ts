import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors();
  
  // Serve static files from uploads folder
  app.use('/api/uploads', express.static(path.join(process.cwd(), 'uploads')));
  
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
