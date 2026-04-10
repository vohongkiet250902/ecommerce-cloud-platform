import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateCouponDto {
  @IsNotEmpty({ message: 'Mã khuyến mãi không được để trống' })
  @IsString()
  code: string;

  @IsNotEmpty({ message: 'Phần trăm giảm giá là bắt buộc' })
  @IsNumber({}, { message: 'Phần trăm giảm giá phải là số' })
  @Min(1, { message: 'Phần trăm giảm giá tối thiểu là 1%' })
  @Max(100, { message: 'Phần trăm giảm giá tối đa là 100%' })
  discountPercentage: number;

  @IsOptional()
  @IsNumber({}, { message: 'Mức giảm tối đa phải là số' })
  @Min(0, { message: 'Mức giảm tối đa không được âm' })
  maxDiscountAmount?: number;

  // 🔥 THÊM MỚI: Giá trị đơn hàng tối thiểu
  @IsOptional()
  @IsNumber({}, { message: 'Giá trị đơn tối thiểu phải là số' })
  @Min(0, { message: 'Giá trị đơn tối thiểu không được âm' })
  minOrderValue?: number;

  // 🔥 THÊM MỚI: Giới hạn số lượt sử dụng
  @IsOptional()
  @IsInt({ message: 'Giới hạn sử dụng phải là số nguyên' })
  @Min(1, { message: 'Giới hạn sử dụng tối thiểu là 1' })
  usageLimit?: number;

  @IsNotEmpty({ message: 'Ngày hết hạn là bắt buộc' })
  @IsDateString(
    {},
    { message: 'Định dạng ngày không hợp lệ (VD: 2024-12-31T23:59:59Z)' },
  )
  expiryDate: string;
}

export class ApplyCouponDto {
  @IsNotEmpty({ message: 'Vui lòng nhập mã khuyến mãi' })
  @IsString()
  code: string;

  // ⚠️ SECURITY NOTE: Xem giải thích bên dưới
  @IsNotEmpty({ message: 'Tổng giá trị đơn hàng là bắt buộc' })
  @IsNumber()
  @Min(0)
  orderTotal: number;
}
