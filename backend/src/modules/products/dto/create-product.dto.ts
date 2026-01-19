import { IsArray, IsMongoId, IsOptional, IsString } from 'class-validator';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsMongoId()
  categoryId: string;

  @IsMongoId()
  brandId: string;

  @IsArray()
  variants: any[];

  @IsOptional()
  @IsArray()
  images?: string[];
}
