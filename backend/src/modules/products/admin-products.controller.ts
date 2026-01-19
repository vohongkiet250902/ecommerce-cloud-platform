import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  Put,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { cloudinaryStorage } from '../../config/cloudinary.storage';
@Roles('admin')
@UseGuards(JwtGuard, RolesGuard)
@Controller('admin/products')
export class AdminProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: cloudinaryStorage,
    }),
  )
  upload(@UploadedFile() file: any) {
    if (!file) {
      throw new Error('FILE IS UNDEFINED');
    }
    console.log('UPLOAD RESULT:', file);
    return {
      url: file.path,
    };
  }

  @Post()
  create(@Body() dto: any) {
    return this.productsService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
