import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Review } from './schemas/review.schema';
import { Product } from '../products/schemas/product.schema';
import { CreateReviewDto } from './dto/create-review.dto';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private readonly reviewModel: Model<Review>,
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
    private readonly ordersService: OrdersService, // Check user đã mua hàng
  ) {}

  private async updateProductAverageRating(productId: string) {
    const result = await this.reviewModel.aggregate([
      { $match: { productId: new Types.ObjectId(productId) } },
      {
        $group: {
          _id: '$productId',
          averageRating: { $avg: '$rating' },
          reviewCount: { $sum: 1 },
        },
      },
    ]);

    if (result.length > 0) {
      await this.productModel.findByIdAndUpdate(productId, {
        averageRating: Math.round(result[0].averageRating * 10) / 10,
        reviewCount: result[0].reviewCount,
      });
    } else {
      await this.productModel.findByIdAndUpdate(productId, {
        averageRating: 0,
        reviewCount: 0,
      });
    }
  }

  async create(userId: string, dto: CreateReviewDto) {
    // 1. Kiểm tra đã mua hàng và đơn hàng đã hoàn thành chưa
    const hasPurchased = await this.ordersService.hasPurchased(
      userId,
      dto.productId,
    );
    if (!hasPurchased) {
      throw new BadRequestException(
        'Bạn cần mua và nhận hàng thành công trước khi đánh giá.',
      );
    }

    // 2. Kiểm tra user đã đánh giá chưa (mỗi user 1 đánh giá / 1 sản phẩm)
    const existingReview = await this.reviewModel.findOne({
      userId: new Types.ObjectId(userId),
      productId: new Types.ObjectId(dto.productId),
    });

    if (existingReview) {
      throw new BadRequestException('Bạn đã đánh giá sản phẩm này rồi.');
    }

    const review = await this.reviewModel.create({
      ...dto,
      userId: new Types.ObjectId(userId),
    });

    await this.updateProductAverageRating(dto.productId);
    return review;
  }

  async findByProductId(productId: string, query: any) {
    const { page = 1, limit = 10 } = query;
    const skip = (+page - 1) * +limit;

    const [data, total] = await Promise.all([
      this.reviewModel
        .find({ productId: new Types.ObjectId(productId) })
        .populate('userId', 'fullName avatar') // Trả về thông tin người dùng
        .skip(skip)
        .limit(+limit)
        .sort({ createdAt: -1 }),
      this.reviewModel.countDocuments({
        productId: new Types.ObjectId(productId),
      }),
    ]);

    return { data, total, page: +page, limit: +limit };
  }

  async findAllForAdmin(query: any) {
    const { page = 1, limit = 20 } = query;
    const skip = (+page - 1) * +limit;

    const [data, total] = await Promise.all([
      this.reviewModel
        .find()
        .populate('userId', 'fullName email') // Lấy info người đánh giá
        .populate('productId', 'name slug') // Lấy info sản phẩm
        .skip(skip)
        .limit(+limit)
        .sort({ createdAt: -1 }),
      this.reviewModel.countDocuments(),
    ]);

    return { data, total, page: +page, limit: +limit };
  }

  // === ADMIN: Xóa đánh giá spam ===
  async removeByAdmin(id: string) {
    const review = await this.reviewModel.findByIdAndDelete(id);
    if (review) {
      // Nhớ tính toán lại số sao trung bình của sản phẩm sau khi xóa review
      await this.updateProductAverageRating(review.productId.toString());
    }
    return review;
  }
}
