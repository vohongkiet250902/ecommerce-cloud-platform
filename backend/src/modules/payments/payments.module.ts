import { OrdersModule } from './../orders/orders.module';
import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { Order, OrderSchema } from '../orders/schemas/order.schema';

@Module({
  imports: [
    forwardRef(() => OrdersModule),
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema }, // 🔥 BẮT BUỘC
    ]),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
