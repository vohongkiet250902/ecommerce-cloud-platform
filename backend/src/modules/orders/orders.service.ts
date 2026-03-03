import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order } from './schemas/order.schema';
import { Product } from '../products/schemas/product.schema';
import { CouponsService } from '../coupons/coupons.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
    private readonly couponsService: CouponsService,
  ) {}

  async create(userId: string, dto: any) {
    if (dto.idempotencyKey) {
      const existingOrder = await this.orderModel.findOne({
        idempotencyKey: dto.idempotencyKey,
      });
      if (existingOrder) return existingOrder;
    }

    let subTotal = 0;
    const orderItems: any[] = [];
    const deductedItems: any[] = []; // Mảng lưu lịch sử để ROLLBACK nếu lỗi

    try {
      for (const item of dto.items) {
        const product = await this.productModel.findOne({
          _id: item.productId,
          'variants.sku': item.sku,
        });

        if (!product)
          throw new BadRequestException(
            `Sản phẩm không tồn tại (SKU: ${item.sku})`,
          );

        const variant = product.variants.find((v) => v.sku === item.sku);
        if (!variant)
          throw new BadRequestException(
            `Phiên bản không tồn tại (SKU: ${item.sku})`,
          );

        // Trừ kho nguyên tử (Đảm bảo kho >= số lượng mua mới trừ)
        const updated = await this.productModel.updateOne(
          {
            _id: product._id,
            'variants.sku': item.sku,
            'variants.stock': { $gte: item.quantity },
          },
          {
            $inc: {
              'variants.$.stock': -item.quantity,
              totalStock: -item.quantity,
            },
          },
        );

        if (updated.modifiedCount === 0) {
          throw new BadRequestException(
            `Sản phẩm SKU ${item.sku} đã hết hàng hoặc không đủ số lượng`,
          );
        }

        // Lưu lại log để rollback nếu có sản phẩm sau bị lỗi
        deductedItems.push({
          productId: product._id,
          sku: item.sku,
          quantity: item.quantity,
        });

        subTotal += variant.price * item.quantity;
        orderItems.push({
          productId: product._id,
          name: product.name,
          sku: item.sku,
          price: variant.price,
          quantity: item.quantity,
          imageUrl: product.images?.[0]?.url,
        });
      }

      let finalTotal = subTotal;
      let discountAmount = 0;

      if (dto.couponCode) {
        const discountResult = await this.couponsService.calculateDiscount({
          code: dto.couponCode,
          orderTotal: subTotal,
        });
        finalTotal = discountResult.finalTotal;
        discountAmount = discountResult.discountAmount;
      }

      if (orderItems.length === 0)
        throw new BadRequestException('Đơn hàng rỗng');

      // 2. Tạo đơn hàng thành công
      return await this.orderModel.create({
        userId: new Types.ObjectId(userId),
        items: orderItems,
        shippingInfo: dto.shippingInfo,
        totalAmount: finalTotal,
        couponCode: dto.couponCode,
        discountAmount: discountAmount,
        paymentMethod: dto.paymentMethod || 'cod',
        idempotencyKey: dto.idempotencyKey,
      });
    } catch (error) {
      // 🚨 CỨU HỘ KHẨN CẤP: Nếu có lỗi (hết hàng 1 món nào đó), cộng lại toàn bộ kho đã trừ
      if (deductedItems.length > 0) {
        const rollbackOps = deductedItems.map((item) => ({
          updateOne: {
            filter: { _id: item.productId, 'variants.sku': item.sku },
            update: {
              $inc: {
                'variants.$.stock': item.quantity,
                totalStock: item.quantity,
              },
            },
          },
        }));
        await this.productModel.bulkWrite(rollbackOps);
      }
      throw error;
    }
  }

  async hasPurchased(userId: string, productId: string): Promise<boolean> {
    const order = await this.orderModel.findOne({
      userId: new Types.ObjectId(userId),
      status: 'completed',
      'items.productId': new Types.ObjectId(productId),
    });
    return !!order;
  }

  async findAll(query: {
    page: number;
    limit: number;
    status?: string;
    userId?: string;
  }) {
    const filter: any = {};
    if (query.status) filter.status = query.status;
    if (query.userId && Types.ObjectId.isValid(query.userId))
      filter.userId = new Types.ObjectId(query.userId);

    const skip = (query.page - 1) * query.limit;

    const [data, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(query.limit),
      this.orderModel.countDocuments(filter),
    ]);

    return { data, total, page: query.page, limit: query.limit };
  }

  async updateStatus(
    orderId: string,
    updateData: { status?: string; paymentStatus?: string },
  ) {
    const order = await this.orderModel.findByIdAndUpdate(orderId, updateData, {
      new: true,
    });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    return order;
  }

  async adminCancelOrder(orderId: string) {
    const order = await this.orderModel.findById(orderId);
    if (!order) throw new BadRequestException('Order not found');
    if (order.status === 'cancelled')
      throw new BadRequestException('Đơn hàng này đã bị hủy rồi');

    // ✅ Tối ưu: Dùng bulkWrite để hoàn kho thay vì vòng lặp for update từng cái
    const ops = order.items.map((item) => ({
      updateOne: {
        filter: { _id: item.productId, 'variants.sku': item.sku },
        update: {
          $inc: {
            'variants.$.stock': item.quantity,
            totalStock: item.quantity,
          },
        },
      },
    }));
    if (ops.length > 0) await this.productModel.bulkWrite(ops);

    order.status = 'cancelled';
    await order.save();
    return order;
  }

  async cancelOrder(orderId: string, userId: string) {
    const order = await this.orderModel.findOne({
      _id: orderId,
      userId: new Types.ObjectId(userId),
    });

    if (!order) throw new BadRequestException('Order not found');
    if (order.status !== 'pending')
      throw new BadRequestException('Chỉ có thể hủy đơn hàng đang chờ xử lý');

    const ops = order.items.map((item) => ({
      updateOne: {
        filter: { _id: item.productId, 'variants.sku': item.sku },
        update: {
          $inc: {
            'variants.$.stock': item.quantity,
            totalStock: item.quantity,
          },
        },
      },
    }));
    if (ops.length > 0) await this.productModel.bulkWrite(ops);

    order.status = 'cancelled';
    await order.save();
    return order;
  }

  async findByUser(
    userId: string,
    query?: { page: number; limit: number; status?: string },
  ) {
    const filter: any = { userId: new Types.ObjectId(userId) };

    // Nếu có lọc theo trạng thái
    if (query?.status) {
      filter.status = query.status;
    }

    // Xử lý phân trang
    const page = query?.page || 1;
    const limit = query?.limit || 10;
    const skip = (page - 1) * limit;

    // Chạy song song 2 query: Lấy data và đếm tổng số
    const [data, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.orderModel.countDocuments(filter),
    ]);

    return { data, total, page, limit };
  }

  async findOneByUser(orderId: string, userId: string) {
    const order = await this.orderModel.findOne({
      _id: orderId,
      userId: new Types.ObjectId(userId),
    });
    if (!order) throw new BadRequestException('Order not found');
    return order;
  }

  async handlePaymentFailed(orderId: string) {
    const order = await this.orderModel.findById(orderId);
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    if (
      order.status === 'cancelled' ||
      order.status === 'completed' ||
      order.status === 'paid'
    ) {
      return order;
    }

    // KHÔNG HỦY ĐƠN VÀ KHÔNG HOÀN KHO NGAY
    // Chỉ cập nhật trạng thái thanh toán để User có thể thấy nút "Thanh toán lại"
    order.paymentStatus = 'pending';
    await order.save();

    console.log(
      `[Order Service] Đơn hàng ${orderId} thanh toán VNPay thất bại. Đang chờ khách thanh toán lại.`,
    );
    return order;
  }

  //Hàm tạo lại link thanh toán cho đơn hàng Pending
  async retryPayment(orderId: string, userId: string) {
    const order = await this.orderModel.findOne({
      _id: orderId,
      userId: new Types.ObjectId(userId),
    });

    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');

    // Chỉ cho phép thanh toán lại nếu đơn hàng đang ở trạng thái pending và chưa thanh toán
    if (order.status !== 'pending' || order.paymentStatus !== 'pending') {
      throw new BadRequestException(
        'Chỉ có thể thanh toán lại đơn hàng đang chờ thanh toán',
      );
    }

    // Đảm bảo đơn hàng này lúc đầu chọn thanh toán bằng VNPay
    if (order.paymentMethod !== 'vnpay') {
      throw new BadRequestException(
        'Đơn hàng này không sử dụng phương thức thanh toán VNPay',
      );
    }

    return order;
  }
}
