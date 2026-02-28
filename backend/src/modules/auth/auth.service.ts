import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import type { Request, Response } from 'express';
import { RegisterDto } from './dto/register.dto';
import { MailerService } from '@nestjs-modules/mailer';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResendOtpDto, VerifyAccountDto } from './dto/verify-account.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
  ) {}

  // --- PRIVATE HELPER: TẠO & GỬI OTP ---
  private async generateAndSendOtp(
    user: any,
    subject: string,
    templateTitle: string,
  ) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const salt = await bcrypt.genSalt();
    const otpHash = await bcrypt.hash(otp, salt);
    const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 phút

    // Lưu OTP vào DB
    await this.usersService.updateOtp(user._id.toString(), otpHash, expires);

    // Gửi Email
    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: subject,
        html: `
          <div style="font-family: Arial; padding: 20px; border: 1px solid #eee;">
            <h2 style="color: #4CAF50;">${templateTitle}</h2>
            <p>Xin chào ${user.fullName}, mã xác thực của bạn là:</p>
            <h1 style="font-size: 32px; letter-spacing: 5px;">${otp}</h1>
            <p>Mã hết hạn sau 5 phút.</p>
          </div>
        `,
      });
    } catch (error) {
      console.error('Lỗi gửi mail:', error);
      throw new BadRequestException('Lỗi gửi email OTP, vui lòng thử lại');
    }
  }
  // 1. ĐĂNG KÝ
  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new BadRequestException('Email đã tồn tại');

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(dto.password, salt);

    // Tạo user (isActive = false)
    const newUser = await this.usersService.create({
      ...dto,
      password: hashedPassword,
      isActive: false, // CHƯA KÍCH HOẠT
    });

    // Gửi OTP kích hoạt
    await this.generateAndSendOtp(
      newUser,
      'Xác thực tài khoản',
      'Kích hoạt tài khoản',
    );

    return { message: 'Đăng ký thành công. Kiểm tra email để lấy mã OTP.' };
  }

  // 2. KÍCH HOẠT TÀI KHOẢN (VERIFY)
  async verifyAccount(dto: VerifyAccountDto) {
    const user = await this.usersService.findByEmailInternal(dto.email);
    if (!user) throw new BadRequestException('Email không tồn tại');
    if (user.isActive)
      throw new BadRequestException('Tài khoản đã kích hoạt rồi');

    if (!user.otpHash || !user.otpExpires || user.otpExpires < new Date()) {
      throw new BadRequestException('OTP không hợp lệ hoặc đã hết hạn');
    }

    const isMatch = await bcrypt.compare(dto.otp, user.otpHash);
    if (!isMatch) throw new BadRequestException('Mã OTP không đúng');

    // Kích hoạt user & xoá OTP
    await this.usersService.activateUser(user._id.toString());

    return { message: 'Kích hoạt tài khoản thành công! Bạn có thể đăng nhập.' };
  }

  // 3. GỬI LẠI MÃ KÍCH HOẠT (RESEND OTP)
  async resendActivationOtp(dto: ResendOtpDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new NotFoundException('Email chưa đăng ký');
    if (user.isActive)
      throw new BadRequestException('Tài khoản này đã kích hoạt rồi');

    await this.generateAndSendOtp(
      user,
      'Gửi lại mã kích hoạt',
      'Mã xác thực mới',
    );
    return { message: 'Đã gửi lại mã OTP vào email.' };
  }

  // 4. ĐĂNG NHẬP
  async login(dto: LoginDto, res: Response) {
    const user = await this.usersService.findByEmailInternal(dto.email);
    if (!user) throw new UnauthorizedException('Sai email hoặc mật khẩu');

    // Check Active
    if (!user.isActive)
      throw new ForbiddenException(
        'Tài khoản chưa kích hoạt. Vui lòng kiểm tra email.',
      );

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) throw new UnauthorizedException('Sai email hoặc mật khẩu');

    // ... (Code tạo Token & Cookie giữ nguyên như cũ) ...
    const payload = { sub: user._id.toString(), role: user.role };
    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: '15m',
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });

    await this.usersService.setRefreshToken(user._id.toString(), refreshToken);

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    });
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    });

    return {
      user: { id: user._id, email: user.email, fullName: user.fullName },
    };
  }

  // 5. QUÊN MẬT KHẨU (Gửi OTP)
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);

    // Chỉ gửi mail nếu tìm thấy user và user đã active để tránh lỗi crash hệ thống
    if (user && user.isActive) {
      await this.generateAndSendOtp(user, 'Quên mật khẩu', 'Đặt lại mật khẩu');
    }

    // Luôn trả về câu này dù có email hay không để chống hacker dò quét email trong DB
    return { message: 'Nếu email tồn tại, OTP đã được gửi.' };
  }

  // 5.5. KIỂM TRA OTP QUÊN MẬT KHẨU (Chỉ check, không reset)
  async verifyResetOtp(dto: VerifyAccountDto) {
    const user = await this.usersService.findByEmailInternal(dto.email);
    if (
      !user ||
      !user.otpHash ||
      !user.otpExpires ||
      user.otpExpires < new Date()
    ) {
      throw new BadRequestException('Mã OTP không hợp lệ hoặc đã hết hạn');
    }

    const isMatch = await bcrypt.compare(dto.otp, user.otpHash);
    if (!isMatch) throw new BadRequestException('Mã OTP không chính xác');

    return { message: 'Mã OTP hợp lệ. Tiếp tục đặt lại mật khẩu.' };
  }

  // 6. ĐẶT LẠI MẬT KHẨU (Reset)
  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.usersService.findByEmailInternal(dto.email);
    if (
      !user ||
      !user.otpHash ||
      !user.otpExpires ||
      user.otpExpires < new Date()
    ) {
      throw new BadRequestException('Yêu cầu không hợp lệ hoặc OTP hết hạn');
    }

    const isMatch = await bcrypt.compare(dto.otp, user.otpHash);
    if (!isMatch) throw new BadRequestException('OTP sai');

    // Đổi pass
    const salt = await bcrypt.genSalt();
    const newPassHash = await bcrypt.hash(dto.newPassword, salt);

    user.password = newPassHash;
    user.otpHash = undefined;
    user.otpExpires = undefined;
    await user.save();

    return { message: 'Đổi mật khẩu thành công. Hãy đăng nhập lại.' };
  }

  // 7. LÀM MỚI TOKEN (Refresh)
  async refresh(req: Request, res: Response) {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) throw new UnauthorizedException('Không tìm thấy token');

    const payload = this.jwtService.verify(refreshToken, {
      secret: process.env.JWT_REFRESH_SECRET,
    });

    const userId = payload.sub as string;

    const ok = await this.usersService.isRefreshTokenValid(
      userId,
      refreshToken,
    );
    if (!ok) {
      // TỐI ƯU: Nếu token hợp lệ nhưng không có trong DB -> Có thể token cũ đã bị lộ và dùng lại
      // Thu hồi toàn bộ token của user này ngay lập tức để bảo vệ tài khoản
      await this.usersService.clearRefreshToken(userId);
      throw new UnauthorizedException('Token không hợp lệ hoặc đã bị thu hồi');
    }

    const user = await this.usersService.findById(userId);
    if (!user || !user.isActive)
      throw new UnauthorizedException('Tài khoản không hợp lệ');

    // TỐI ƯU (Refresh Token Rotation): Cấp lại CẢ 2 token mới thay vì chỉ Access Token
    const newAccessToken = this.jwtService.sign(
      { sub: userId, role: user.role },
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '15m' },
    );

    const newRefreshToken = this.jwtService.sign(
      { sub: userId, role: user.role },
      { secret: process.env.JWT_REFRESH_SECRET, expiresIn: '7d' },
    );

    // Cập nhật Token mới vào DB
    await this.usersService.setRefreshToken(userId, newRefreshToken);

    const isProd = process.env.NODE_ENV === 'production';

    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      sameSite: 'strict',
      secure: isProd,
    });

    res.cookie('refreshToken', newRefreshToken, {
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
