import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Param,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

import { UploadService } from '../../modules/upload/upload.service';
import { ProductsService } from './products.service';

@Controller('admin/products')
@Roles('admin')
@UseGuards(JwtGuard, RolesGuard)
export class AdminProductsController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly productsService: ProductsService, // ✅ BẮT BUỘC
  ) {}

  // ===== Upload multiple images =====
  @Post('upload-multiple')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: memoryStorage(),
    }),
  )
  async uploadMultiple(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || !files.length) {
      throw new BadRequestException('No files uploaded');
    }

    const images = await Promise.all(
      files.map((file) => this.uploadService.uploadImage(file, 'products')),
    );

    return { images };
  }

  // ===== Create product =====
  @Post()
  create(@Body() dto: any) {
    return this.productsService.create(dto);
  }

  // ===== Update product =====
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.productsService.update(id, dto);
  }

  // ===== Delete product =====
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  @Delete(':id/images')
  removeImage(
    @Param('id') productId: string,
    @Query('publicId') publicId: string,
  ) {
    console.log('REMOVE IMAGE ROUTE HIT');
    return this.productsService.removeImage(productId, publicId);
  }
}
