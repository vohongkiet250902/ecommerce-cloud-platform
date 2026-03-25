import { PartialType } from '@nestjs/mapped-types';
import { CreateGhnDto } from './create-ghn.dto';

export class UpdateGhnDto extends PartialType(CreateGhnDto) {}
