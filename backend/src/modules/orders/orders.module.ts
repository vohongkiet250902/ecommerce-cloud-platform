// src/modules/orders/orders.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { AdminOrdersController } from './admin-orders.controller';
import { GhnWebhookController } from './ghn-webhook.controller';

// Schemas
import { Order, OrderSchema } from './schemas/order.schema';
import { Product, ProductSchema } from '../products/schemas/product.schema'; // 🔥 1. Import Product Schema

// Other Modules
import { PaymentsModule } from '../payments/payments.module';
import { InventoryModule } from '../inventory/inventory.module';
import { CouponsModule } from '../coupons/coupons.module';
import { GhnModule } from '../ghn/ghn.module';

@Module({
  imports: [
    // 🔥 2. Đăng ký thêm ProductModel vào đây
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
    forwardRef(() => PaymentsModule),
    InventoryModule,
    CouponsModule,
    GhnModule,
  ],
  controllers: [OrdersController, AdminOrdersController, GhnWebhookController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
