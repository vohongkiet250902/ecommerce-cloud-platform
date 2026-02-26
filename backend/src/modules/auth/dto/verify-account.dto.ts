import { IsEmail, IsString, Length } from 'class-validator';

export class VerifyAccountDto {
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email: string;

  @IsString()
  @Length(6, 6, { message: 'Mã OTP phải có đúng 6 ký tự' })
  otp: string;
}

export class ResendOtpDto {
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email: string;
}
