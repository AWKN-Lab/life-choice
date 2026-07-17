import { IsString, IsOptional } from 'class-validator';

export class ActivateMembershipDto {
  @IsString()
  planId: string;

  @IsOptional()
  @IsString()
  orderId?: string;
}

export class UnlockModuleDto {
  @IsString()
  moduleId: string;

  @IsOptional()
  @IsString()
  recordId?: string;

  /** 任务 3.2: ¥1 深推已支付订单 ID（第5条分支识别） */
  @IsOptional()
  @IsString()
  orderId?: string;
}
