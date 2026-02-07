import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsMongoId,
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
