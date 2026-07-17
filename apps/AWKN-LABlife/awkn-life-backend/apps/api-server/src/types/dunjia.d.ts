declare module '@yhjs/dunjia' {
  export interface BoardMeta {
    type: 'hour' | 'day' | 'month' | 'year' | 'minute';
    datetime: Date;
    yinyang: string;
    juNumber: number;
    xunHead: string;
    xunHeadGan: string;
    ganZhi: string;
    solarTerm: string;
    moveStarOffset: number;
  }

  export interface StarInfo {
    name: string;
    shortName: string;
    wuxing: string;
    originPalace: number;
  }

  export interface DoorInfo {
    name: string;
    shortName: string;
    wuxing: string;
    originPalace: number;
  }

  export interface GodInfo {
    name: string;
    shortName: string;
    wuxing: string;
  }

  export interface Palace {
    index: number;
    position: number;
    name: string;
    groundGan: string;
    groundExtraGan: string | null;
    skyGan: string;
    skyExtraGan: string | null;
    star: StarInfo | null;
    door: DoorInfo | null;
    god: GodInfo | null;
    outGan: string | null;
    outExtraGan: string | null;
    outerGods: any[];
  }

  export interface TimeDunjiaBoard {
    meta: BoardMeta;
    palace(index: number): Palace;
    moveStar(steps: number): TimeDunjiaBoard;
    applyOuterGod(plugin: any): TimeDunjiaBoard;
    toJSON(): any;
  }

  export interface TimeDunjiaOptions {
    datetime: Date;
    type?: 'hour' | 'day' | 'month' | 'year' | 'minute';
  }

  export class TimeDunjia {
    static create(options: TimeDunjiaOptions): TimeDunjiaBoard;
    static from(data: any): TimeDunjiaBoard;
  }

  export interface PosDunjiaOptions {
    datetime: Date;
    angle: number;
    posType?: 'year' | 'dragon';
    trans?: '正盘' | '归一' | '合十' | '反转';
  }

  export class PosDunjia {
    static create(options: PosDunjiaOptions): any;
  }

  export function buildBoard(options: any): any;
  export function getMountainIndexFromAngle(angle: number): number;
  export function getMountainInfo(index: number): any;
  export function getMountainDetailFromAngle(angle: number, pan: string): any;
  export function getNumData(angle: number, detail: any): any;
  export function getOppositeAngle(angle: number): number;
}
