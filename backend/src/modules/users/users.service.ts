import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  // --- PUBLIC METHODS (Dùng cho Controller trả về Client - Ẩn dữ liệu nhạy cảm) ---

  async create(userData: Partial<User>): Promise<UserDocument> {
    const newUser = new this.userModel(userData);
    return newUser.save();
  }

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel
      .findById(id)
      .select('-password -refreshToken')
      .exec();

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email })
      .select('-password -refreshToken')
      .exec();
  }

  // --- INTERNAL METHODS (Dùng cho AuthService) ---

  async findByEmailInternal(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email })
      .select('+password +refreshToken')
      .exec();
  }

  async findByIdInternal(id: string): Promise<UserDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    return this.userModel.findById(id).select('+refreshToken').exec();
  }

  async updateInternal(
    id: string,
    updateData: Partial<User>,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
  }

  // ======================================================
  // =============== ADMIN METHODS (BẮT BUỘC) =============
  // ======================================================

  // Lấy danh sách user cho admin (Ẩn dữ liệu nhạy cảm)
  async findAllForAdmin(): Promise<UserDocument[]> {
    return this.userModel.find().select('-password -refreshToken').exec();
  }

  // Lấy chi tiết 1 user cho admin
  async findOneForAdmin(id: string): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('User not found');
    }

    const user = await this.userModel
      .findById(id)
      .select('-password -refreshToken')
      .exec();

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // Block / Unblock user (dùng isActive)
  async updateStatus(
    id: string,
    isActive: boolean,
  ): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('User not found');
    }

    const user = await this.userModel.findByIdAndUpdate(
      id,
      { isActive },
      { new: true },
    );

    if (!user) throw new NotFoundException('User not found');

    return { message: 'Cập nhật trạng thái user thành công' };
  }
}
