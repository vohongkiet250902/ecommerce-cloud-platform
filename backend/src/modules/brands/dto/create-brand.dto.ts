import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

export class CreateBrandDto {
  @IsNotEmpty({ message: 'Tên thương hiệu không được để trống' })
  @IsString({ message: 'Tên thương hiệu phải là chuỗi ký tự' })
  name: string;

  @IsNotEmpty({ message: 'Slug không được để trống' })
  @IsString()
  slug: string;

  @IsOptional()
  @IsUrl({}, { message: 'Logo phải là một đường dẫn URL hợp lệ' })
  logo?: string;

  @IsOptional()
  @IsBoolean({
    message: 'Trạng thái isActive phải là kiểu boolean (true/false)',
  })
  isActive?: boolean;
}
