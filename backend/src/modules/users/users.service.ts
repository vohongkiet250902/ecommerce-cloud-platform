import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import * as crypto from 'crypto';
import {
  UpdateProfileDto,
  CreateAddressDto,
  UpdateAddressDto,
} from './dto/user-profile.dto';
import { GetUsersQueryDto } from './dto/get-users-query.dto';

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
    if (!Types.ObjectId.isValid(id))
      throw new NotFoundException('User not found');
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
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

  // --- QUẢN LÝ TOKEN & OTP ---

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

  async updateOtp(userId: string, otpHash: string, otpExpires: Date) {
    return this.userModel.updateOne({ _id: userId }, { otpHash, otpExpires });
  }

  async activateUser(userId: string) {
    return this.userModel.updateOne(
      { _id: userId },
      { isActive: true, $unset: { otpHash: 1, otpExpires: 1 } },
    );
  }

  // --- ADMIN THAO TÁC ---

  async findAllForAdmin(query: GetUsersQueryDto) {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const filter = search
      ? {
          $or: [
            { email: new RegExp(search, 'i') },
            { fullName: new RegExp(search, 'i') },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.userModel
        .find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.userModel.countDocuments(filter),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOneForAdmin(id: string): Promise<UserDocument> {
    return this.findById(id);
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

  // --- USER PROFILE & ADDRESS ---

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<UserDocument> {
    const updatedUser = await this.userModel
      .findByIdAndUpdate(userId, dto, { new: true })
      .exec();
    if (!updatedUser) throw new NotFoundException('User not found');
    return updatedUser;
  }

  async addAddress(userId: string, dto: CreateAddressDto) {
    const userMeta = await this.userModel
      .findById(userId)
      .select('addresses')
      .exec();
    if (!userMeta) throw new NotFoundException('User not found');

    const isFirstAddress = userMeta.addresses.length === 0;
    if (isFirstAddress) dto.isDefault = true;

    if (dto.isDefault && !isFirstAddress) {
      await this.userModel.updateOne(
        { _id: userId },
        { $set: { 'addresses.$[].isDefault': false } },
      );
    }

    return this.userModel.findByIdAndUpdate(
      userId,
      { $push: { addresses: dto } },
      { new: true },
    );
  }

  async updateAddress(
    userId: string,
    addressId: string,
    dto: UpdateAddressDto,
  ) {
    if (dto.isDefault) {
      await this.userModel.updateOne(
        { _id: userId },
        { $set: { 'addresses.$[].isDefault': false } },
      );
    }

    const setUpdate: Record<string, any> = {};
    for (const [key, value] of Object.entries(dto)) {
      setUpdate[`addresses.$.${key}`] = value;
    }

    const updatedUser = await this.userModel.findOneAndUpdate(
      { _id: userId, 'addresses._id': addressId },
      { $set: setUpdate },
      { new: true },
    );

    if (!updatedUser) throw new NotFoundException('Address not found');
    return updatedUser;
  }

  async deleteAddress(userId: string, addressId: string) {
    const updatedUser = await this.userModel.findOneAndUpdate(
      { _id: userId },
      { $pull: { addresses: { _id: addressId } } },
      { new: true },
    );

    if (!updatedUser) throw new NotFoundException('User not found');

    const hasDefault = updatedUser.addresses.some((addr) => addr.isDefault);
    if (!hasDefault && updatedUser.addresses.length > 0) {
      const firstAddressId = updatedUser.addresses[0]._id as Types.ObjectId;
      await this.setDefaultAddress(userId, firstAddressId.toString());
    }

    return { message: 'Xóa địa chỉ thành công' };
  }

  async setDefaultAddress(userId: string, addressId: string) {
    await this.userModel.bulkWrite([
      {
        updateOne: {
          filter: { _id: userId },
          update: { $set: { 'addresses.$[].isDefault': false } },
        },
      },
      {
        updateOne: {
          filter: { _id: userId, 'addresses._id': addressId },
          update: { $set: { 'addresses.$.isDefault': true } },
        },
      },
    ]);

    return this.findById(userId);
  }
}
