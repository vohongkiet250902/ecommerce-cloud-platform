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
import { UploadService } from '../upload/upload.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { memoryStorage } from 'multer';

@Roles('admin')
@UseGuards(JwtGuard, RolesGuard)
@Controller('admin/products')
export class AdminProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly uploadService: UploadService,
  ) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File) {
    try {
      console.log('FILE:', file);

      if (!file) {
        throw new Error('FILE IS UNDEFINED');
      }

      const url = await this.uploadService.uploadImage(file, 'products');
      return { url };
    } catch (err) {
      console.error('UPLOAD ERROR:', err);
      throw err;
    }
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
