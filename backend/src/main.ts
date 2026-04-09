import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import cookieParser from 'cookie-parser';
import { configCloudinary } from './config/cloudinary.config';
import { NestExpressApplication } from '@nestjs/platform-express'; // 🔥 Thêm import này

async function bootstrap() {
  console.log('🔥 NEST APP STARTED');

  // Cấu hình Cloudinary (Giữ nguyên của bạn)
  configCloudinary();

  // 🔥 Ép kiểu sang NestExpressApplication để dùng được các tính năng của Express
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 🔥 CỰC KỲ QUAN TRỌNG: Bật trust proxy để lấy IP thật của Client (Dùng cho Rate Limiting)
  app.set('trust proxy', 1);

  const configService = app.get(ConfigService);
  const port = configService.get('PORT') as number;

  // Prefix API (Giữ nguyên)
  app.setGlobalPrefix('api/v1', { exclude: [''] });

  // Validation (Giữ nguyên)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Exception Filter & Cookie (Giữ nguyên)
  app.useGlobalFilters(new AllExceptionsFilter());
  app.use(cookieParser());

  // CORS (Giữ nguyên)
  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });

  await app.listen(port);
  console.log(`🚀 Backend E-commerce is running on port ${port}`);
}
bootstrap();
