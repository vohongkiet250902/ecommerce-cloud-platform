import {
  IsDateString,
  IsIn,
  IsInt,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class StockInDto {
  @IsMongoId()
  productId: string;

  @IsString()
  sku: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitCost: number;

  @IsOptional()
  @IsDateString()
  receivedAt?: string;

  @IsOptional()
  @IsIn(['opening_balance', 'purchase', 'return', 'manual'])
  sourceType?: 'opening_balance' | 'purchase' | 'return' | 'manual';

  @IsOptional()
  @IsString()
  sourceRef?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
