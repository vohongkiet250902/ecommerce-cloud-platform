import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { BrandsService } from './brands.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Roles('admin')
@UseGuards(JwtGuard, RolesGuard)
@Controller('admin/brands')
export class AdminBrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Post()
  create(@Body() dto: any) {
    return this.brandsService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.brandsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.brandsService.remove(id);
  }
}
