import {
  IsArray,
  IsBoolean,
  IsMongoId,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  // Cho phép null để đưa về root:
  // class-validator không validate null với IsMongoId, nên ta để any và validate trong service như trên
  @IsOptional()
  parentId?: string | null;

  @IsOptional()
  @IsArray()
  filterableAttributes?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
