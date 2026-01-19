import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Brand } from './schemas/brand.schema';

@Injectable()
export class BrandsService {
  constructor(
    @InjectModel(Brand.name)
    private readonly brandModel: Model<Brand>,
  ) {}

  async create(dto: any) {
    const exists = await this.brandModel.findOne({ slug: dto.slug });
    if (exists) throw new BadRequestException('Slug already exists');
    return this.brandModel.create(dto);
  }

  async update(id: string, dto: any) {
    const brand = await this.brandModel.findByIdAndUpdate(id, dto, {
      new: true,
    });
    if (!brand) throw new NotFoundException('Brand not found');
    return brand;
  }

  async remove(id: string) {
    return this.brandModel.findByIdAndDelete(id);
  }

  async findAll() {
    return this.brandModel.find({ isActive: true }).sort({ name: 1 });
  }
}
