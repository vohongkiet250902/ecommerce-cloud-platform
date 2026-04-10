import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager'; // 🔥 Import type Cache

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req) => req?.cookies?.accessToken,
      ]),
      secretOrKey: process.env.JWT_ACCESS_SECRET,
      passReqToCallback: true, // 🔥 BẬT TÍNH NĂNG NÀY ĐỂ LẤY REQUEST
    });
  }

  // 🔥 Đã thêm req vào tham số
  async validate(req: any, payload: any) {
    const token = req?.cookies?.accessToken;

    if (token) {
      // Đọc trong Redis xem token có bị blacklist không
      const isBlacklisted = await this.cacheManager.get(`bl_${token}`);
      if (isBlacklisted) {
        throw new UnauthorizedException(
          'Phiên đăng nhập đã hết hạn hoặc bị thu hồi',
        );
      }
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
