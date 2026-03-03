import {
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateReviewDto {
  @IsNotEmpty({ message: 'Product ID là bắt buộc' })
  @IsMongoId({ message: 'Product ID không đúng định dạng' })
  productId: string;

  @IsNotEmpty({ message: 'SKU sản phẩm là bắt buộc' })
  @IsString()
  sku: string;

  @IsNotEmpty({ message: 'Vui lòng chọn số sao đánh giá' })
  @IsNumber({}, { message: 'Số sao phải là dạng số' })
  @Min(1, { message: 'Đánh giá thấp nhất là 1 sao' })
  @Max(5, { message: 'Đánh giá cao nhất là 5 sao' })
  rating: number;

  @IsOptional()
  @IsString()
  comment?: string;
}
