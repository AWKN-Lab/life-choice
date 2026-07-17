// K线 / 潮汐图 查询 DTO
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class KlineQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  startYear?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  startMonth?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  months?: number;
}

export class TideQueryDto extends KlineQueryDto {}
