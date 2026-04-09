import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { SearchModule } from './modules/search/search.module';
import { MongooseModule } from '@nestjs/mongoose';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { CategoriesModule } from './modules/categories/categories.module';
import { BrandsModule } from './modules/brands/brands.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { CartModule } from './modules/cart/cart.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { UploadModule } from './modules/upload/upload.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { AiChatModule } from './modules/ai-chat/ai-chat.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ScheduleModule } from '@nestjs/schedule';
@Module({
  imports: [
    UsersModule,
    AuthModule,
    ProductsModule,
    OrdersModule,
    SearchModule,
    ConfigModule.forRoot({ isGlobal: true }),
    CategoriesModule,
    BrandsModule,
    PaymentsModule,
    CartModule,
    UploadModule,
    ScheduleModule.forRoot(),
    //config DB
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    //config Email
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
    CouponsModule,
    ReviewsModule,
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule], // 🔥 Bắt buộc phải import ConfigModule
      useFactory: async (configService: ConfigService) => ({
        store: await redisStore({
          // 🔥 Lấy từ biến môi trường, mặc định là localhost nếu chạy dev
          url:
            configService.get<string>('REDIS_URL') || 'redis://localhost:6379',
          ttl: 60 * 1000,
        }),
      }),
      inject: [ConfigService], // 🔥 Inject ConfigService vào
    }),
    AiChatModule,
    InventoryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
