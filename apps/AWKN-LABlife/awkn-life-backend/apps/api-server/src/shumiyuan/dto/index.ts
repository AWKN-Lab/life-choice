export class SpeakInputDto {
  question: string;
  userId?: string;
}

export class SpeakOutputDto {
  recordId: string;
  sessionId: string;
  identifiedType: string;
  relatedPeople: string[];
  userEmotion: string;
  coreStuckPoint: string;
  riskWords: string[];
  options: string[];
  nextStep: string;
}

export class SpreadConfirmDto {
  stuckPoint?: string;
  people?: string[];
  fearedResult?: string;
  desiredResult?: string;
  regretPoint?: string;
  confirmed: boolean;
}

export class SpreadOutputDto {
  recordId: string;
  cards: SpreadCardDto[];
  needsPeopleDetail: boolean;
  peopleQuestions?: PeopleQuestionDto[];
}

export class SpreadCardDto {
  key: string;
  title: string;
  content: string;
  type: 'default' | 'conditional';
  editable: boolean;
}

export class PeopleQuestionDto {
  question: string;
  options: string[];
}

export class BottomResultDto {
  recordId: string;
  stuckPoint: string;
  people: string[];
  risks: string[];
  threeWays: string[];
  minStep: string;
  reviewPoint: string;
  dispatchOptions: DispatchOptionDto[];
}

export class DispatchOptionDto {
  key: string;
  label: string;
  description: string;
}

export class DispatchActionDto {
  action: 'chronicle' | 'respread' | 'miaosuan' | 'xingtu';
  recordId: string;
}
