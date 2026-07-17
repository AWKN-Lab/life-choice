import { IsString, IsNumber, IsEnum, IsOptional } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  productType: 'membership' | 'single';

  @IsString()
  productId: string;

  @IsEnum(['stripe', 'wechat', 'alipay'])
  paymentMethod: 'stripe' | 'wechat' | 'alipay';

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  metadata?: Record<string, string>;
}
