import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { OrdersController } from './orders.controller';
import { AdminOrdersController } from './admin-orders.controller';
import { GhnWebhookController } from './ghn-webhook.controller';

import { OrdersService } from './orders.service';
import { OrdersShippingService } from './orders-shipping.service';
import { OrdersAnalyticsService } from './orders-analytics.service';
import { OrdersCron } from './orders.cron';

import { Order, OrderSchema } from './schemas/order.schema';

import { PaymentsModule } from '../payments/payments.module';
import { InventoryModule } from '../inventory/inventory.module';
import { CouponsModule } from '../coupons/coupons.module';
import { GhnModule } from '../ghn/ghn.module';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    forwardRef(() => PaymentsModule),
    InventoryModule,
    CouponsModule,
    GhnModule,
    ProductsModule,
  ],
  controllers: [OrdersController, AdminOrdersController, GhnWebhookController],
  providers: [
    OrdersService,
    OrdersShippingService,
    OrdersAnalyticsService,
    OrdersCron,
  ],
  exports: [OrdersService, OrdersShippingService, OrdersAnalyticsService],
})
export class OrdersModule {}
