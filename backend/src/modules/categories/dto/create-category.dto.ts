import { IsNotEmpty, IsString, Matches } from 'class-validator';
export class CreateCategoryDto {
  @IsNotEmpty({ message: 'Tên danh mục không được để trống' })
  @IsString()
  name: string;

  @IsNotEmpty({ message: 'Slug không được để trống' })
  @IsString()
  // Regex khớp với logic validate ở FE: chỉ chữ thường, số và gạch ngang
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug chỉ chứa ký tự thường, số và dấu gạch ngang',
  })
  slug: string;
}
