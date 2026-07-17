import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsIn,
  IsArray,
  IsObject,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

/** 创建命例 */
export class CreateSavedCaseDto {
  @IsOptional()
  @IsString()
  recordId?: string;

  @IsString()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsObject()
  snapshot?: Record<string, unknown>;

  @IsOptional()
  @IsIn(['private', 'public'])
  visibility?: 'private' | 'public';
}

/** 部分更新命例 — 所有字段可选 */
export class UpdateSavedCaseDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsObject()
  snapshot?: Record<string, unknown>;

  @IsOptional()
  @IsIn(['private', 'public'])
  visibility?: 'private' | 'public';
}

/** 列表查询参数 */
export class ListSavedCasesQueryDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsIn(['private', 'public', 'all'])
  scope?: 'private' | 'public' | 'all';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
