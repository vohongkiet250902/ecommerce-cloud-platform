import { Controller, Post, Body, Res, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Request, Response } from 'express';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { Throttle } from '@nestjs/throttler'; // 🔥 Bổ sung Import Throttler

import { RegisterDto } from './dto/register.dto';
import { ResendOtpDto, VerifyAccountDto } from './dto/verify-account.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 1. Đăng ký (🛡️ Tối đa 3 lần / 1 giờ - Chống tool tạo account rác)
  @Throttle({ default: { limit: 3, ttl: 60 * 60 * 1000 } })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // 2. Kích hoạt tài khoản (🛡️ Tối đa 5 lần / 15 phút - Chống tool dò mã OTP)
  @Throttle({ default: { limit: 5, ttl: 15 * 60 * 1000 } })
  @Post('verify-account')
  verifyAccount(@Body() dto: VerifyAccountDto) {
    return this.authService.verifyAccount(dto);
  }

  // 3. Gửi lại mã kích hoạt (🛡️ Tối đa 3 lần / 15 phút - Chống spam gửi mail)
  @Throttle({ default: { limit: 3, ttl: 15 * 60 * 1000 } })
  @Post('resend-activation')
  resendActivation(@Body() dto: ResendOtpDto) {
    return this.authService.resendActivationOtp(dto);
  }

  // 4. Đăng nhập (🛡️ Tối đa 5 lần / 5 phút - Chống Brute-force dò mật khẩu)
  @Throttle({ default: { limit: 5, ttl: 5 * 60 * 1000 } })
  @Post('login')
  login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.login(dto, res);
  }

  // 5. Quên mật khẩu (🛡️ Tối đa 3 lần / 15 phút - Chống spam gửi mail)
  @Throttle({ default: { limit: 3, ttl: 15 * 60 * 1000 } })
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  // 5.5. Kiểm tra mã OTP quên mật khẩu (🛡️ Tối đa 5 lần / 15 phút)
  @Throttle({ default: { limit: 5, ttl: 15 * 60 * 1000 } })
  @Post('verify-reset-otp')
  verifyResetOtp(@Body() dto: VerifyAccountDto) {
    return this.authService.verifyResetOtp(dto);
  }

  // 6. Đặt lại mật khẩu (🛡️ Tối đa 3 lần / 15 phút)
  @Throttle({ default: { limit: 3, ttl: 15 * 60 * 1000 } })
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  // 7. Refresh Token (Giữ nguyên mức Rate Limit mặc định 100/phút)
  @Post('refresh')
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.authService.refresh(req, res);
  }

  // 8. Đăng xuất (Giữ nguyên mức Rate Limit mặc định)
  @UseGuards(JwtGuard)
  @Post('logout')
  logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    return this.authService.logout(req.user.id, res);
  }
}
