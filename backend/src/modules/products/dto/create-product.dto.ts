import { Type } from 'class-transformer';
import {
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
  IsIn,
  Max,
  IsBoolean,
} from 'class-validator';

class ProductAttributeDto {
  @IsNotEmpty()
  @IsString()
  key: string;

  @IsNotEmpty()
  @IsString()
  value: string;
}
class ProductVariantDto {
  @IsNotEmpty({ message: 'Mã SKU không được để trống' })
  @IsString()
  sku: string;

  @IsNotEmpty({ message: 'Giá sản phẩm là bắt buộc' })
  @IsNumber({}, { message: 'Giá sản phẩm phải là số' })
  @Min(0, { message: 'Giá sản phẩm không được nhỏ hơn 0' })
  price: number;

  @IsOptional()
  @IsNumber({}, { message: 'Số lượng tồn kho phải là số' })
  @Min(0, { message: 'Số lượng tồn kho không được là số âm' })
  stock?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductAttributeDto)
  attributes?: ProductAttributeDto[];

  @IsOptional()
  image?: { url: string; publicId: string };

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercentage?: number;
}

export class CreateProductDto {
  @IsNotEmpty({ message: 'Tên sản phẩm không được để trống' })
  @IsString()
  name: string;

  @IsNotEmpty({ message: 'Slug không được để trống' })
  @IsString()
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty({ message: 'Category ID là bắt buộc' })
  @IsMongoId({ message: 'Category ID không đúng định dạng' })
  categoryId: string;

  @IsNotEmpty({ message: 'Brand ID là bắt buộc' })
  @IsMongoId({ message: 'Brand ID không đúng định dạng' })
  brandId: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants?: ProductVariantDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductAttributeDto)
  specs?: ProductAttributeDto[];

  @IsOptional()
  @IsArray()
  images?: { url: string; publicId: string }[];

  @IsOptional()
  @IsIn(['active', 'inactive'], {
    message: "Status chỉ được nhận 'active' hoặc 'inactive'",
  })
  status?: string;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}
