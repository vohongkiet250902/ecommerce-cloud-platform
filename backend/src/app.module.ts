import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule'; // 🔥 Import Schedule (Cron Job)
import { APP_GUARD } from '@nestjs/core';

// Throttler & Cache
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';

// Database & Mailer
import { MongooseModule } from '@nestjs/mongoose';
import { MailerModule } from '@nestjs-modules/mailer';
import { LoggerMiddleware } from './common/middleware/logger.middleware';

// Feature Modules
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { SearchModule } from './modules/search/search.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { BrandsModule } from './modules/brands/brands.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { CartModule } from './modules/cart/cart.module';
import { UploadModule } from './modules/upload/upload.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { AiChatModule } from './modules/ai-chat/ai-chat.module';
import { InventoryModule } from './modules/inventory/inventory.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // 🔥 1. Kích hoạt Cron Job (Dùng cho tự động hủy đơn VNPay)
    ScheduleModule.forRoot(),

    // 🔥 2. Cấu hình Rate Limiting với Redis
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            name: 'short',
            ttl: 1000, // 1 giây
            limit: 3, // Tối đa 3 request / 1 giây
          },
          {
            name: 'default',
            ttl: 60000, // 1 phút
            limit: 100, // Tối đa 100 request / 1 phút
          },
        ],
        storage: new ThrottlerStorageRedisService(
          configService.get<string>('REDIS_URL') || 'redis://localhost:6379',
        ),
      }),
    }),

    // 🔥 3. Cấu hình DB Mongoose (Giữ nguyên)
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),

    // 🔥 4. Cấu hình Mailer (Giữ nguyên)
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.get<string>('MAIL_HOST'),
          auth: {
            user: configService.get<string>('MAIL_USER'),
            pass: configService.get<string>('MAIL_PASSWORD'),
          },
        },
        defaults: {
          from: `"No Reply" <${configService.get<string>('MAIL_FROM')}>`,
        },
      }),
    }),

    // 🔥 5. Cấu hình Cache Redis (Đã sửa để dùng biến môi trường thay vì hardcode)
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: await redisStore({
          url:
            configService.get<string>('REDIS_URL') || 'redis://localhost:6379',
          ttl: 60 * 1000,
        }),
      }),
    }),

    // 🔥 6. Nạp toàn bộ Feature Modules của bạn
    UsersModule,
    AuthModule,
    ProductsModule,
    OrdersModule,
    SearchModule,
    CategoriesModule,
    BrandsModule,
    PaymentsModule,
    CartModule,
    UploadModule,
    CouponsModule,
    ReviewsModule,
    AiChatModule,
    InventoryModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // 🔥 Kích hoạt bảo vệ API (Rate Limit) cho toàn bộ ứng dụng
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
