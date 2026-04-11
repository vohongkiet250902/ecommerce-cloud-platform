import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateCategoryDto } from './create-category.dto';
import { IsOptional, IsMongoId, ValidateIf } from 'class-validator';

export class UpdateCategoryDto extends PartialType(
  OmitType(CreateCategoryDto, ['parentId'] as const),
) {
  @IsOptional()
  @ValidateIf((o) => o.parentId !== null && o.parentId !== '')
  @IsMongoId({
    message: 'parentId phải là định dạng ObjectId hợp lệ của MongoDB',
  })
  parentId?: string | null;
}
