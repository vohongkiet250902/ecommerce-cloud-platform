import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order } from './schemas/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { Product } from '../products/schemas/product.schema';
import { OrderItem } from './schemas/order.schema';
@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<Order>,

    @InjectModel(Product.name)
    private readonly productModel: Model<Product>,
  ) {}

  async create(userId: string, dto: CreateOrderDto) {
    let totalAmount = 0;

    // 🔥 KHAI BÁO 1 LẦN DUY NHẤT
    const orderItems: OrderItem[] = [];

    for (const item of dto.items) {
      const product = await this.productModel.findOne({
        _id: item.productId,
        'variants.sku': item.sku,
      });

      if (!product) {
        throw new BadRequestException('Product not found');
      }

      const variant = product.variants.find((v) => v.sku === item.sku);

      if (!variant) {
        throw new BadRequestException('Variant not found');
      }

      const updated = await this.atomicDeductStock(
        product._id,
        item.sku,
        item.quantity,
      );

      if (!updated) {
        throw new BadRequestException(`Out of stock for SKU ${item.sku}`);
      }

      totalAmount += variant.price * item.quantity;

      // ✅ PUSH VÀO BIẾN ĐÚNG
      orderItems.push({
        productId: product._id,
        name: product.name,
        sku: item.sku,
        price: variant.price,
        quantity: item.quantity,
        imageUrl: product.images?.[0]?.url,
      });
    }

    // 🔒 SAFETY CHECK (RẤT NÊN CÓ)
    if (orderItems.length === 0) {
      throw new BadRequestException('Order items is empty');
    }
    console.log('DTO ITEMS:', dto.items);

    return this.orderModel.create({
      userId: new Types.ObjectId(userId),
      items: orderItems, // 🔥 GIỜ SẼ CÓ DATA
      totalAmount,
    });
  }

  private async atomicDeductStock(
    productId: Types.ObjectId,
    sku: string,
    quantity: number,
  ) {
    const result = await this.productModel.updateOne(
      {
        _id: productId,
        'variants.sku': sku,
        'variants.stock': { $gte: quantity },
      },
      {
        $inc: {
          'variants.$.stock': -quantity,
          totalStock: -quantity,
        },
      },
    );
    return result.modifiedCount === 1;
  }

  async cancelOrder(orderId: string, userId: string) {
    const order = await this.orderModel.findOne({
      _id: orderId,
      userId: new Types.ObjectId(userId),
    });

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    if (order.status !== 'pending') {
      throw new BadRequestException('Cannot cancel this order');
    }

    // 🔥 rollback stock
    for (const item of order.items) {
      await this.productModel.updateOne(
        {
          _id: item.productId,
          'variants.sku': item.sku,
        },
        {
          $inc: {
            'variants.$.stock': item.quantity,
            totalStock: item.quantity,
          },
        },
      );
    }

    order.status = 'cancelled';
    await order.save();

    return order;
  }

  async adminCancelOrder(orderId: string) {
    const order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new BadRequestException('Order not found');
    }

    if (order.status === 'cancelled') {
      throw new BadRequestException('Order already cancelled');
    }

    // Restore stock
    for (const item of order.items) {
      await this.productModel.updateOne(
        {
          _id: item.productId,
          'variants.sku': item.sku,
        },
        {
          $inc: {
            'variants.$.stock': item.quantity,
            totalStock: item.quantity,
          },
        },
      );
    }

    order.status = 'cancelled';
    await order.save();
    return order;
  }

  async findAll() {
    return this.orderModel.find().populate('userId', 'name email').sort({ createdAt: -1 });
  }

  async updateStatus(
    orderId: string,
    updateData: { status?: string; paymentStatus?: string },
  ) {
    return this.orderModel.findByIdAndUpdate(
      orderId,
      updateData,
      { new: true },
    );
  }

  async findByUser(userId: string) {
    return this.orderModel
      .find({
        userId: new Types.ObjectId(userId),
      })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });
  }

  async findOneByUser(orderId: string, userId: string) {
    const order = await this.orderModel.findOne({
      _id: orderId,
      userId: new Types.ObjectId(userId),
    });

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    return order;
  }
}
