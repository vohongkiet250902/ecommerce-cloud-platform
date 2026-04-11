import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req) => req?.cookies?.accessToken,
      ]),
      // 🔥 Lấy secret từ ConfigService
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET'), 
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: any) {
    const token = req?.cookies?.accessToken;

    if (token) {
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