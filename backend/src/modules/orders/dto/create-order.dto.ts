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
  IsDefined,
  IsNotEmptyObject,
  IsObject,
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

export class ShippingInfoDto {
  @IsString()
  receiverName: string;

  @IsString()
  phone: string;

  @IsString()
  street: string;

  @IsString()
  ward: string;

  @IsString()
  district: string;

  @IsString()
  city: string;
}

export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @IsOptional()
  @IsIn(['cod', 'mock', 'vnpay'], {
    message: "Phương thức thanh toán chỉ được là: 'cod', 'mock' hoặc 'vnpay'",
  })
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsDefined({ message: 'Vui lòng cung cấp thông tin giao hàng' })
  @IsNotEmptyObject()
  @IsObject()
  @ValidateNested()
  @Type(() => ShippingInfoDto)
  shippingInfo: ShippingInfoDto;
}
