import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Coupon } from './schemas/coupon.schema';
import { CreateCouponDto } from './dto/coupon.dto';

@Injectable()
export class CouponsService {
  constructor(
    @InjectModel(Coupon.name) private readonly couponModel: Model<Coupon>,
  ) {}

  async create(dto: CreateCouponDto) {
    const existingCoupon = await this.couponModel.findOne({
      code: dto.code.toUpperCase(),
    });
    if (existingCoupon) {
      throw new BadRequestException('Mã khuyến mãi này đã tồn tại');
    }

    return this.couponModel.create({
      ...dto,
      code: dto.code.toUpperCase(),
    });
  }

  async calculateDiscount(dto: { code: string; orderTotal: number }) {
    const coupon = await this.couponModel.findOne({
      code: dto.code.toUpperCase(),
      isActive: true,
    });

    if (!coupon) {
      throw new NotFoundException(
        'Mã khuyến mãi không hợp lệ hoặc không tồn tại',
      );
    }

    if (new Date() > new Date(coupon.expiryDate)) {
      throw new BadRequestException('Mã khuyến mãi này đã hết hạn');
    }

    // Kiểm tra giới hạn số lượng
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('Mã khuyến mãi này đã hết lượt sử dụng');
    }

    // Kiểm tra giá trị tối thiểu của đơn hàng
    if (coupon.minOrderValue && dto.orderTotal < coupon.minOrderValue) {
      throw new BadRequestException(
        `Đơn hàng phải từ ${coupon.minOrderValue}đ để áp dụng mã này`,
      );
    }

    let discountAmount = dto.orderTotal * (coupon.discountPercentage / 100);

    if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
      discountAmount = coupon.maxDiscountAmount;
    }

    return {
      originalTotal: dto.orderTotal,
      discountPercentage: coupon.discountPercentage,
      discountAmount: discountAmount,
      finalTotal: dto.orderTotal - discountAmount,
      couponCode: coupon.code,
    };
  }

  async consumeCoupon(code: string, session: any) {
    const updatedCoupon = await this.couponModel.findOneAndUpdate(
      {
        code: code.toUpperCase(),
        isActive: true,
        $expr: {
          $or: [
            { $eq: [{ $type: '$usageLimit' }, 'missing'] }, // Không có giới hạn
            { $lt: ['$usedCount', '$usageLimit'] }, // Hoặc số lượng dùng < giới hạn
          ],
        },
      },
      {
        $inc: { usedCount: 1 },
      },
      { session, new: true },
    );

    if (!updatedCoupon) {
      throw new BadRequestException(
        'Mã khuyến mãi đã hết lượt sử dụng trong lúc bạn đang đặt hàng',
      );
    }

    return updatedCoupon;
  }

  async findAll() {
    return this.couponModel.find().sort({ createdAt: -1 });
  }

  async toggleStatus(id: string) {
    const coupon = await this.couponModel.findById(id);
    if (!coupon) throw new NotFoundException('Không tìm thấy mã');

    coupon.isActive = !coupon.isActive;
    return coupon.save();
  }
}
