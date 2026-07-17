export class MiaosuanInputDto {
  type: 'case' | 'person' | 'review';
  title: string;
  content: string;
  consultRecordId?: string;
  personId?: string;
  userId?: string;
}

export class MiaosuanResultDto {
  id: string;
  type: string;
  title: string;
  scenarios: ScenarioDto[];
  keyFactors: string[];
  blindSpots: string[];
  recommendation: string;
  createdAt: Date;
}

export class ScenarioDto {
  name: string;
  probability: string;
  outcome: string;
  risks: string[];
  requirements: string[];
}
