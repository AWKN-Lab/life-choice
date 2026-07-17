import { globalRegistry } from '../index';
import { rizhuStrengthTool, RizhuStrengthInput, RizhuStrengthOutput } from './rizhu-strength';
import { wuxingBalanceTool, WuxingBalanceInput, WuxingBalanceOutput } from './wuxing-balance';
import { shishenTool, ShishenInput, ShishenOutput } from './shishen';
import { dayunStageTool, DayunStageInput, DayunStageOutput } from './dayun-stage';
import { liunianTool, LiunianInput, LiunianOutput } from './liunian';
import { chongHeTool, ChongHeInput, ChongHeOutput } from './chong-he';

export { rizhuStrengthTool } from './rizhu-strength';
export { wuxingBalanceTool } from './wuxing-balance';
export { shishenTool } from './shishen';
export { dayunStageTool } from './dayun-stage';
export { liunianTool } from './liunian';
export { chongHeTool } from './chong-he';

export type { RizhuStrengthInput, RizhuStrengthOutput } from './rizhu-strength';
export type { WuxingBalanceInput, WuxingBalanceOutput } from './wuxing-balance';
export type { ShishenInput, ShishenOutput } from './shishen';
export type { DayunStageInput, DayunStageOutput } from './dayun-stage';
export type { LiunianInput, LiunianOutput } from './liunian';
export type { ChongHeInput, ChongHeOutput } from './chong-he';

export function registerBaziTools(): void {
  globalRegistry.register(rizhuStrengthTool);
  globalRegistry.register(wuxingBalanceTool);
  globalRegistry.register(shishenTool);
  globalRegistry.register(dayunStageTool);
  globalRegistry.register(liunianTool);
  globalRegistry.register(chongHeTool);
}

registerBaziTools();
