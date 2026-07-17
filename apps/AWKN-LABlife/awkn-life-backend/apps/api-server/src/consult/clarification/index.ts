/**
 * T2.1-T2.3: 追问模块统一导出
 */
export {
  SLOT_SCHEMAS,
  CONSULT_TYPE_KEYWORDS,
  ConsultType,
  SlotDefinition,
  getRequiredSlots,
  getAllSlots,
  findSlot,
} from './slot-schema';

export {
  CompletenessAssessorService,
  CompletenessAssessment,
  AssessorOptions,
} from './completeness-assessor.service';

export {
  ClarificationService,
  AssessAndClarifyResult,
  MAX_CLARIFICATION_ROUNDS,
} from './clarification.service';

export { ClarificationModule } from './clarification.module';
