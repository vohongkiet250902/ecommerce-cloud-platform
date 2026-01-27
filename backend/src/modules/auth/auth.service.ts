import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
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
    if (!user) {
      throw new UnauthorizedException('Email không tồn tại');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Sai mật khẩu');
    }

    // ✅ MATCH SCHEMA
    if (!user.isActive) {
      throw new ForbiddenException('Tài khoản đã bị khoá');
    }

    return user;
  }

  private hashToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async login(email: string, password: string, res: Response) {
    const user = await this.validateUser(email, password);

    const payload = {
      sub: user._id.toString(),
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });

    const hashedRefreshToken = this.hashToken(refreshToken);

    await this.usersService.updateInternal(user._id.toString(), {
      refreshToken: hashedRefreshToken,
    });

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      sameSite: 'strict',
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: 'strict',
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
    if (!refreshToken) {
      throw new UnauthorizedException();
    }

    const payload = this.jwtService.verify(refreshToken, {
      secret: process.env.JWT_REFRESH_SECRET,
    });

    const user = await this.usersService.findByIdInternal(payload.sub);

    const hashed = this.hashToken(refreshToken);
    if (!user || user.refreshToken !== hashed) {
      throw new UnauthorizedException();
    }

    const newAccessToken = this.jwtService.sign(
      { sub: user._id.toString(), role: user.role },
      {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: '15m',
      },
    );

    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      sameSite: 'strict',
    });

    return { message: 'Refresh thành công' };
  }

  async logout(userId: string, res: Response) {
    await this.usersService.updateInternal(userId, {
      refreshToken: undefined,
    });

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    return { message: 'Đăng xuất thành công' };
  }
}
