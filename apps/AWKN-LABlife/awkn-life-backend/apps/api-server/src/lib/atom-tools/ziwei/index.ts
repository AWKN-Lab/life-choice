import { globalRegistry } from '../index';
import { minggongMaster } from './minggong-master';
import { sihuaDistribution } from './sihua-distribution';
import { palaceCombination } from './palace-combination';
import { starInteraction } from './star-interaction';
import { feigongTool } from './feigong';
import { dayunOverlayTool } from './dayun-overlay';
import { tripleAlignmentTool } from './triple-alignment';

export { minggongMaster } from './minggong-master';
export { sihuaDistribution } from './sihua-distribution';
export { palaceCombination } from './palace-combination';
export { starInteraction } from './star-interaction';
export { feigongTool } from './feigong';
export { dayunOverlayTool } from './dayun-overlay';
export { tripleAlignmentTool } from './triple-alignment';

export type { ZiweiChartInput, ZiweiPalaceData } from './ziwei-types';
export type { MinggongMasterInput, MinggongMasterOutput } from './minggong-master';
export type { SihuaDistributionInput, SihuaDistributionOutput, SihuaStar } from './sihua-distribution';
export type { PalaceCombinationInput, PalaceCombinationOutput, PalaceDetail } from './palace-combination';
export type { StarInteractionInput, StarInteractionOutput, StarInteraction } from './star-interaction';
export type { FeigongInput, FeigongOutput, FeigongPath } from './feigong';
export type { DayunOverlayInput, DayunOverlayOutput, OverlayEffect } from './dayun-overlay';
export type { TripleAlignmentInput, TripleAlignmentOutput } from './triple-alignment';

export function registerZiweiTools(): void {
  globalRegistry.register(minggongMaster);
  globalRegistry.register(sihuaDistribution);
  globalRegistry.register(palaceCombination);
  globalRegistry.register(starInteraction);
  globalRegistry.register(feigongTool);
  globalRegistry.register(dayunOverlayTool);
  globalRegistry.register(tripleAlignmentTool);
}

registerZiweiTools();
