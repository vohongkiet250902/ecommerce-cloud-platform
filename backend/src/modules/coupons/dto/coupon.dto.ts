import {
  IsDateString,
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
  @IsNumber()
  @Min(1)
  @Max(100)
  discountPercentage: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number;

  @IsNotEmpty({ message: 'Ngày hết hạn là bắt buộc' })
  @IsDateString({}, { message: 'Định dạng ngày không hợp lệ' })
  expiryDate: string;
}

export class ApplyCouponDto {
  @IsNotEmpty({ message: 'Vui lòng nhập mã khuyến mãi' })
  @IsString()
  code: string;

  @IsNotEmpty({ message: 'Tổng giá trị đơn hàng là bắt buộc' })
  @IsNumber()
  @Min(0)
  orderTotal: number;
}
