import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GoogleAuthDto {
  @IsString()
  @IsNotEmpty()
  credential: string;

  @IsOptional()
  @IsEnum(['BUYER', 'SELLER'])
  role?: 'BUYER' | 'SELLER';
}
