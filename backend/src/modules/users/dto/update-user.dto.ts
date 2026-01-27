import { IsBoolean } from 'class-validator';

export enum UserStatus {
  ACTIVE = 'active',
  BLOCKED = 'blocked',
}

export class UpdateUserStatusDto {
  @IsBoolean()
  isActive: boolean;
}
