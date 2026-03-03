import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { UsersService } from './users.service';
import {
  UpdateProfileDto,
  CreateAddressDto,
  UpdateAddressDto,
} from './dto/user-profile.dto';

@Controller('users')
@UseGuards(JwtGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@Req() req: any) {
    return this.usersService.findById(req.user.id);
  }

  @Patch('me')
  updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.id, dto);
  }

  @Get('me/addresses')
  async getMyAddresses(@Req() req: any) {
    const user = await this.usersService.findById(req.user.id);
    return user.addresses;
  }

  @Post('me/addresses')
  addAddress(@Req() req: any, @Body() dto: CreateAddressDto) {
    return this.usersService.addAddress(req.user.id, dto);
  }

  @Patch('me/addresses/:addressId')
  updateAddress(
    @Req() req: any,
    @Param('addressId') addressId: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.usersService.updateAddress(req.user.id, addressId, dto);
  }

  @Patch('me/addresses/:addressId/default')
  setDefaultAddress(@Req() req: any, @Param('addressId') addressId: string) {
    return this.usersService.setDefaultAddress(req.user.id, addressId);
  }

  @Delete('me/addresses/:addressId')
  deleteAddress(@Req() req: any, @Param('addressId') addressId: string) {
    return this.usersService.deleteAddress(req.user.id, addressId);
  }
}
