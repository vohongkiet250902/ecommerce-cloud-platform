import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ParseMongoIdPipe } from '../../common/pipes/parse-mongo-id.pipe'; // 🔥 Import Pipe

@Roles('admin')
@UseGuards(JwtGuard, RolesGuard)
@Controller('admin/categories')
export class AdminCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAllForAdmin() {
    return this.categoriesService.findAllForAdmin();
  }

  // Chú ý: NestJS đã tự động bắt ValidationPipe global nếu bạn setup trong main.ts.
  // Nên không cần @UsePipes(new ValidationPipe({ whitelist: true })) lặp lại ở từng route.
  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseMongoIdPipe) id: string, // 🔥 Validate params.id
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseMongoIdPipe) id: string, // 🔥 Validate params.id
    @Body('isActive') isActive: boolean,
  ) {
    return this.categoriesService.updateStatus(id, isActive);
  }

  @Delete(':id')
  remove(@Param('id', ParseMongoIdPipe) id: string) {
    // 🔥 Validate params.id
    return this.categoriesService.remove(id);
  }
}
