import { globalRegistry } from '../index';
import { timingTool } from './timing';
import { riskTool } from './risk';
import { careerFitTool } from './career-fit';
import { relationshipTool } from './relationship';
import { crossValidateTool } from './cross-validate';

export { timingTool } from './timing';
export { riskTool } from './risk';
export { careerFitTool } from './career-fit';
export { relationshipTool } from './relationship';
export { crossValidateTool } from './cross-validate';

export type { TimingInput, TimingOutput, BaziDayunData, ZiweiDaxianData, DecisionType } from './timing';
export type { RiskInput, RiskOutput, RiskSignal, BaziRiskData, ZiweiRiskData } from './risk';
export type { CareerFitInput, CareerFitOutput, CareerCategory } from './career-fit';
export type { RelationshipInput, RelationshipOutput, PartyBaziData, PartyZiweiData } from './relationship';
export type { CrossValidateInput, CrossValidateOutput, ValidateDomain, BaziJudgment, ZiweiJudgment, QimenJudgment } from './cross-validate';

export function registerDecisionTools(): void {
  globalRegistry.register(timingTool);
  globalRegistry.register(riskTool);
  globalRegistry.register(careerFitTool);
  globalRegistry.register(relationshipTool);
  globalRegistry.register(crossValidateTool);
}

registerDecisionTools();
