// /mnt/data/users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import * as crypto from 'crypto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  private hashRefreshToken(token: string) {
    const secret =
      process.env.REFRESH_TOKEN_HASH_SECRET || 'dev_refresh_hash_secret';
    return crypto.createHmac('sha256', secret).update(token).digest('hex');
  }

  async create(userData: Partial<User>): Promise<UserDocument> {
    const newUser = new this.userModel(userData);
    return newUser.save();
  }

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id).exec(); // schema đã select:false
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec(); // schema đã select:false
  }

  async findByEmailInternal(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email })
      .select('+password +otpHash +otpExpires +refreshToken +isActive')
      .exec();
  }

  async findByIdInternal(id: string): Promise<UserDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.userModel.findById(id).select('+refreshToken').exec();
  }

  async setRefreshToken(userId: string, refreshToken: string) {
    const refreshTokenHash = this.hashRefreshToken(refreshToken);
    await this.userModel.updateOne(
      { _id: userId },
      { $set: { refreshToken: refreshTokenHash } },
    );
  }

  async isRefreshTokenValid(userId: string, refreshToken: string) {
    const user = await this.findByIdInternal(userId);
    if (!user?.refreshToken) return false;

    const refreshTokenHash = this.hashRefreshToken(refreshToken);
    return user.refreshToken === refreshTokenHash;
  }

  async clearRefreshToken(userId: string) {
    await this.userModel.updateOne(
      { _id: userId },
      { $unset: { refreshToken: '' } },
    );
  }

  async updateInternal(
    id: string,
    updateData: Partial<User>,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
  }

  async findAllForAdmin(): Promise<UserDocument[]> {
    return this.userModel.find().exec();
  }

  async findOneForAdmin(id: string): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(id))
      throw new NotFoundException('User not found');
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateStatus(
    id: string,
    isActive: boolean,
  ): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(id))
      throw new NotFoundException('User not found');
    const user = await this.userModel.findByIdAndUpdate(
      id,
      { isActive },
      { new: true },
    );
    if (!user) throw new NotFoundException('User not found');
    return { message: 'Cập nhật trạng thái user thành công' };
  }

  async updateOtp(userId: string, otpHash: string, otpExpires: Date) {
    return this.userModel.updateOne({ _id: userId }, { otpHash, otpExpires });
  }

  // SỬA LỖI 1: Thêm hàm này vào (bạn đang thiếu hàm này)
  async activateUser(userId: string) {
    return this.userModel.updateOne(
      { _id: userId },
      {
        isActive: true,
        $unset: { otpHash: 1, otpExpires: 1 }, // Xoá OTP sau khi kích hoạt xong
      },
    );
  }

  async clearOtp(userId: string) {
    return this.userModel.updateOne(
      { _id: userId },
      { $unset: { otpHash: 1, otpExpires: 1 } },
    );
  }
}
