import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ChatRequestDto {
  @IsString()
  @MinLength(2)
  @MaxLength(1000)
  message: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sessionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  userId?: string;
}
