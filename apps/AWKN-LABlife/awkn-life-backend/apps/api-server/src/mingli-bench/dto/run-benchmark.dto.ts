import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { LlmProviderType } from '../../llm-providers/llm-providers.service';

export class RunBenchmarkDto {
  @IsOptional()
  @IsInt()
  @Min(2020)
  @Max(2030)
  year?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  sampleSize?: number;

  @IsOptional()
  @IsBoolean()
  useCot?: boolean;

  @IsOptional()
  @IsBoolean()
  useAstro?: boolean;

  @IsOptional()
  @IsBoolean()
  shuffleOptions?: boolean;

  @IsOptional()
  @IsString()
  @IsEnum(['minimax', 'doubao', 'deepseek', 'sensenova', 'deepseek-direct'])
  provider?: LlmProviderType;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxWorkers?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  rounds?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @IsOptional()
  @IsBoolean()
  enableComparison?: boolean;

  @IsOptional()
  @IsBoolean()
  enableVoting?: boolean;
}
