import { IsString, IsOptional, MinLength, MaxLength, ValidateNested, IsArray, IsDateString, IsBoolean, IsNumber } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class RouteDto {
  @IsString()
  @MinLength(2, { message: '问题内容至少2个字符' })
  @MaxLength(500, { message: '问题内容不能超过500个字符' })
  question: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  device?: string;
}

export class SubmitInfoDto {
  @IsString()
  sessionId: string;

  @IsOptional()
  @IsString()
  routeType?: string;

  @IsOptional()
  @IsString()
  route_type?: string;

  @IsString()
  question: string;

  @IsOptional()
  @IsString()
  askTime?: string;

  @IsOptional()
  @IsString()
  ask_time?: string;

  @IsOptional()
  @IsString()
  askLocation?: string;

  @IsOptional()
  @IsString()
  ask_location?: string;

  @IsOptional()
  @IsString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  birth_date?: string;

  @IsOptional()
  @IsString()
  birthTime?: string;

  @IsOptional()
  @IsString()
  birth_time?: string;

  @IsOptional()
  @IsString()
  birthPlace?: string;

  @IsOptional()
  @IsString()
  birth_place?: string;

  @IsOptional()
  @IsString()
  gender?: 'male' | 'female';

  @IsOptional()
  @IsBoolean()
  isTimeUnknown?: boolean;

  @IsOptional()
  @IsBoolean()
  is_time_unknown?: boolean;

  @IsOptional()
  @IsBoolean()
  timeUnknown?: boolean;

  @IsOptional()
  @IsBoolean()
  time_unknown?: boolean;
}

export class SaveRecordDto {
  @IsString()
  recordId: string;
}

export class DeleteRecordsDto {
  @IsArray()
  @IsString({ each: true })
  recordIds: string[];
}

export class PersonProfilesQueryDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  routeType?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}

/**
 * 单次咨询分析接口 DTO
 * 目标：一次 API 调用完成 算法+知识库+LLM渲染
 */
export class ConsultAnalyzeDto {
  @IsString()
  @IsOptional()
  routeType?: 'ziping' | 'liuren' | 'quming' | 'qimen' | 'liuyao' | 'ziwei' | 'zhangsheng';

  @IsOptional()
  @IsString()
  route_type?: string;

  @IsString()
  @MinLength(2, { message: '问题内容至少2个字符' })
  @MaxLength(500, { message: '问题内容不能超过500个字符' })
  question: string;

  // 东方命理命理参数
  @IsOptional()
  @IsString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  birth_date?: string;

  @IsOptional()
  @IsString()
  birthTime?: string;

  @IsOptional()
  @IsString()
  birthPlace?: string;

  @IsOptional()
  @IsString()
  gender?: 'male' | 'female';

  // 断事推演参数
  @IsOptional()
  @IsString()
  askTime?: string;

  @IsOptional()
  @IsString()
  askLocation?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  lang?: string;

  // 取名专用参数
  @IsOptional()
  @IsString()
  surname?: string;

  @IsOptional()
  @IsString()
  parentWish?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  avoidChars?: string[];

  @IsOptional()
  @IsString()
  sourceEntry?: string;

  @IsOptional()
  @IsString()
  source_entry?: string;

  @IsOptional()
  @IsString()
  namingType?: string;

  @IsOptional()
  @IsString()
  naming_type?: string;

  @IsOptional()
  @IsString()
  namingPreferences?: string;

  @IsOptional()
  @IsString()
  naming_preferences?: string;

  @IsOptional()
  @IsString()
  questionIntent?: string;

  @IsOptional()
  @IsString()
  question_intent?: string;

  @IsOptional()
  @IsString()
  unlockStatus?: string;

  @IsOptional()
  @IsString()
  unlock_status?: string;

  // P0-2: stylePreference 改为 string[]，兼容 JSON 字符串和单字符串归一化
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
      } catch { /* not JSON, treat as single value */ }
      return [value];
    }
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  style_preference?: string[];

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
      } catch { /* not JSON, treat as single value */ }
      return [value];
    }
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  stylePreference?: string[];

  @IsOptional()
  @IsString()
  improve_focus?: string;

  @IsOptional()
  @IsString()
  improveFocus?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  target_audience?: string;

  @IsOptional()
  @IsString()
  targetAudience?: string;

  @IsOptional()
  @IsString()
  original_name?: string;

  @IsOptional()
  @IsString()
  originalName?: string;

  @IsOptional()
  @IsString()
  custom_description?: string;

  @IsOptional()
  @IsString()
  customDescription?: string;

  @IsOptional()
  @IsString()
  birth_hour?: string;

  @IsOptional()
  @IsString()
  birth_minute?: string;

  // P0-2: K线节点上下文字段
  @IsOptional()
  @IsString()
  targetDate?: string;

  @IsOptional()
  @IsNumber()
  opportunityScore?: number;
}

export class FortuneQueryDto {
  @IsString()
  birthDate: string;

  @IsOptional()
  @IsString()
  birthTime?: string;

  @IsOptional()
  @IsString()
  gender?: 'male' | 'female';

  @IsOptional()
  @IsString()
  birthPlace?: string;
}

export class CelebritySimilarityDto {
  @IsString()
  birthDate: string;

  @IsOptional()
  @IsString()
  birthTime?: string;

  @IsOptional()
  @IsString()
  gender?: 'male' | 'female';

  @IsOptional()
  @IsString()
  birthPlace?: string;
}

/**
 * 单次咨询分析接口响应结构
 * 对齐前端 ResultPage 期望的数据结构
 */
export interface ConsultAnalyzeResponse {
  route_type: string;
  summary_line: string;
  summary_body: string;
  risks: string[];
  actions: string[];
  time_window: string;
  evidence_fold: string;
  paywall_modules: string[];
  record_id: string;
  // 八字详细数据（由 calc-engine 计算）
  calc_result: {
    yearPillar: string;
    monthPillar: string;
    dayPillar: string;
    hourPillar: string;
    yearShishen?: string;
    monthShishen?: string;
    dayShishen?: string;
    hourShishen?: string;
    wuxing?: {
      year?: string;
      month?: string;
      day?: string;
      hour?: string;
    };
    naYin?: {
      year: string;
      month: string;
      day: string;
      hour: string;
    };
    mingGong?: string;
  };
  // 算法原始结果（用于调试）
  algorithm_result?: Record<string, unknown>;
}
