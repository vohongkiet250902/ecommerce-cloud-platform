import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDefined,
  IsIn,
  IsInt,
  IsMongoId,
  IsNotEmptyObject,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class UpsertCartItemDto {
  @IsMongoId()
  productId: string;

  @IsString()
  sku: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class RemoveCartItemDto {
  @IsMongoId()
  productId: string;

  @IsString()
  sku: string;
}

/**
 * Optional: cho phép update nhiều items 1 lần (batch)
 * Useful nếu FE sync cart local -> server
 */
export class ReplaceCartDto {
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => UpsertCartItemDto)
  items: UpsertCartItemDto[];
}

export class GetCartQueryDto {
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  expand?: boolean;
}

export class ApplyCouponCartDto {
  @IsString()
  code: string;
}

export class CartShippingInfoDto {
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

export class CheckoutCartDto {
  @IsOptional()
  @IsIn(['cod', 'mock', 'vnpay'])
  paymentMethod?: string;
  @IsDefined({ message: 'Vui lòng cung cấp thông tin giao hàng' })
  @IsNotEmptyObject()
  @IsObject()
  @ValidateNested()
  @Type(() => CartShippingInfoDto)
  shippingInfo: CartShippingInfoDto;
}
