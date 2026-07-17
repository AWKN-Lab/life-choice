import { IsString, IsOptional, IsEnum } from 'class-validator';

export class AgentRelayDto {
  @IsString()
  agentName!: string;

  @IsString()
  rawOutput!: string;

  @IsOptional()
  @IsEnum(['professional', 'warm', 'concise', 'detailed', 'literary'])
  style?: string;

  @IsOptional()
  @IsString()
  question?: string;

  @IsOptional()
  @IsString()
  category?: string;
}
