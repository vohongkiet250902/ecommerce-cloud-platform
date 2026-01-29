import { IsNotEmpty, IsString, IsOptional, IsArray } from 'class-validator';
export class CreateCategoryDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  slug: string;

  @IsOptional()
  parentId?: string;

  // Thêm trường này
  @IsOptional()
  @IsArray()
  @IsString({ each: true }) // Kiểm tra từng phần tử trong mảng là string
  filterableAttributes?: string[];
}
