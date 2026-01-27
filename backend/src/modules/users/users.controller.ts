import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@Req() req: any) {
    return this.usersService.findById(req.user.id);
  }
}
