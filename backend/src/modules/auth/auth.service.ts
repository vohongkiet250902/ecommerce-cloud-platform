import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import type { Request, Response } from 'express';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  private async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmailInternal(email);
    if (!user) throw new UnauthorizedException('Email không tồn tại');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new UnauthorizedException('Sai mật khẩu');

    if (!user.isActive) throw new ForbiddenException('Tài khoản đã bị khoá');

    return user;
  }

  async login(email: string, password: string, res: Response) {
    const user = await this.validateUser(email, password);

    const payload = {
      sub: user._id.toString(),
      role: user.role,
      // (optional) nếu muốn JwtStrategy có email thì add:
      // email: user.email,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });

    // ✅ lưu HASH refresh token vào DB
    await this.usersService.setRefreshToken(user._id.toString(), refreshToken);

    const isProd = process.env.NODE_ENV === 'production';

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      sameSite: 'strict',
      secure: isProd,
      // maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: 'strict',
      secure: isProd,
      // maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      user: {
        id: user._id,
        name: user.fullName,
        email: user.email,
        role: user.role,
      },
    };
  }

  async refresh(req: Request, res: Response) {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) throw new UnauthorizedException();

    // verify chữ ký & hạn
    const payload = this.jwtService.verify(refreshToken, {
      secret: process.env.JWT_REFRESH_SECRET,
    });

    const userId = payload.sub as string;

    // ✅ check refresh token hash trong DB
    const ok = await this.usersService.isRefreshTokenValid(
      userId,
      refreshToken,
    );
    if (!ok) throw new UnauthorizedException();

    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException();

    const newAccessToken = this.jwtService.sign(
      { sub: userId, role: user.role /*, email: user.email */ },
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '15m' },
    );

    const isProd = process.env.NODE_ENV === 'production';

    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      sameSite: 'strict',
      secure: isProd,
    });

    return { message: 'Refresh thành công' };
  }

  async logout(userId: string, res: Response) {
    // ✅ clear hash trong DB
    await this.usersService.clearRefreshToken(userId);

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    return { message: 'Đăng xuất thành công' };
  }
}
