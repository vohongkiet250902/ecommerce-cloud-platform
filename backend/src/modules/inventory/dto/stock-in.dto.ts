import {
  IsDateString,
  IsIn,
  IsInt,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';

export class StockInDto {
  @IsMongoId()
  productId: string;

  @IsString()
  sku: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @ValidateIf((o) => o.unitCost == null)
  @IsNumber()
  @Min(0)
  totalBatchCost?: number;

  @ValidateIf((o) => o.totalBatchCost == null)
  @IsNumber()
  @Min(0)
  unitCost?: number;

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
