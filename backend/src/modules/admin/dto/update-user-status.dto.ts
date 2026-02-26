import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateUserStatusDto {
  @IsEnum(['ACTIVE', 'BLOCKED'])
  status: 'ACTIVE' | 'BLOCKED';

  @IsOptional()
  @IsString()
  reason?: string;
}
