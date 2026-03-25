import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class SimulateGhnStatusDto {
  @IsString()
  @MinLength(1)
  status: string;

  @IsOptional()
  @IsString()
  @IsIn(['Switch_status', 'ManualSync', 'Webhook', 'Create'])
  type?: string;
}
