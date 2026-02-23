import {
  IsArray,
  IsBoolean,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateCategoryDto {
  @IsNotEmpty({ message: 'Tên danh mục không được để trống' })
  @IsString()
  name: string;

  @IsNotEmpty({ message: 'Slug không được để trống' })
  @IsString()
  slug: string;

  @IsOptional()
  @IsMongoId({
    message: 'parentId phải là một định dạng ObjectId hợp lệ của MongoDB',
  })
  parentId?: string;

  @IsOptional()
  @IsArray({ message: 'filterableAttributes phải là một mảng' })
  @IsString({ each: true, message: 'Mỗi thuộc tính trong mảng phải là chuỗi' })
  filterableAttributes?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
