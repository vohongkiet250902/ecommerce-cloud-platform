import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsMongoId,
  IsString,
  Min,
  ValidateNested,
  IsOptional,
  IsIn,
} from 'class-validator';

export class CreateOrderItemDto {
  @IsMongoId()
  productId: string;

  @IsString()
  sku: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  // BƯỚC MỚI: Bổ sung trường paymentMethod vào đây để NestJS cho phép nhận dữ liệu
  @IsOptional()
  @IsIn(['cod', 'mock', 'vnpay'], {
    message: "Phương thức thanh toán chỉ được là: 'cod', 'mock' hoặc 'vnpay'",
  })
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  couponCode?: string;
}
