import { Controller, Post, Body, Res, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Request, Response } from 'express'; // Import type từ express
import { JwtGuard } from '../../common/guards/jwt.guard'; // Đảm bảo đường dẫn đúng tới JwtGuard của bạn

import { RegisterDto } from './dto/register.dto';
import { ResendOtpDto, VerifyAccountDto } from './dto/verify-account.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 1. Đăng ký
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // 2. Kích hoạt tài khoản
  @Post('verify-account')
  verifyAccount(@Body() dto: VerifyAccountDto) {
    return this.authService.verifyAccount(dto);
  }

  // 3. Gửi lại mã kích hoạt
  @Post('resend-activation')
  resendActivation(@Body() dto: ResendOtpDto) {
    return this.authService.resendActivationOtp(dto);
  }

  // 4. Đăng nhập
  @Post('login')
  login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.login(dto, res);
  }

  // 5. Quên mật khẩu
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  // 5.5. Kiểm tra mã OTP quên mật khẩu
  @Post('verify-reset-otp')
  verifyResetOtp(@Body() dto: VerifyAccountDto) {
    return this.authService.verifyResetOtp(dto);
  }

  // 6. Đặt lại mật khẩu
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  // 7. Refresh Token
  // Route này nhận Cookie nên cần @Req()
  @Post('refresh')
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.authService.refresh(req, res);
  }

  // 8. Đăng xuất
  @UseGuards(JwtGuard)
  @Post('logout')
  logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    return this.authService.logout(req.user.id, res);
  }
}
