export class CreatePersonDto {
  name?: string;
  relationType?: string;
  importance?: string;
  currentStatus?: string;
  riskTags?: string[];
  recentInteraction?: string;
  currentAdvice?: string;
  birthDate?: string;
  birthTime?: string;
  gender?: string;
  birthPlace?: string;
}

export class UpdatePersonDto {
  name?: string;
  relationType?: string;
  importance?: string;
  currentStatus?: string;
  riskTags?: string[];
  recentInteraction?: string;
  currentAdvice?: string;
}

export class EightDimensionsDto {
  role?: string;
  relationship?: string;
  motivation?: string;
  ability?: string;
  resources?: string;
  credit?: string;
  behavior?: string;
  risk?: string;
}

export class FilterDto {
  filter?: 'all' | 'important' | 'recent' | 'risk' | 'watch';
}

export class CreateRelatedCaseDto {
  caseTitle: string;
  hisRole?: string;
  whatHeSaid?: string;
  whatHeDid?: string;
  result?: string;
  impactOnJudgment?: string;
  consultRecordId?: string;
}

export class NetworkNodeDto {
  id: string;
  name: string;
  relationType: string;
  importance: string;
  currentStatus: string;
  riskTags: string[];
  currentAdvice: string;
  completeness: number;
}

export class NetworkEdgeDto {
  source: string;
  target: string;
  relation: string;
}

export class NetworkDataDto {
  nodes: NetworkNodeDto[];
  edges: NetworkEdgeDto[];
  center: string;
}
