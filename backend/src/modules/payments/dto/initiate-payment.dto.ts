import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class InitiatePaymentDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsEnum(['PIX', 'CREDIT_CARD'])
  method: 'PIX' | 'CREDIT_CARD';

  @IsOptional()
  @IsString()
  cardToken?: string;
}
