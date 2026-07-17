import { Injectable } from '@nestjs/common';
import { MAData } from './fortune.types';
import { KlinePoint } from './kline.generator';

@Injectable()
export class MovingAverageService {

  calculateMA(data: KlinePoint[], period: number): (number | null)[] {
    return data.map((_, index) => {
      if (index < period - 1) return null;
      const slice = data.slice(index - period + 1, index + 1);
      const sum = slice.reduce((acc, d) => acc + d.score, 0);
      return Math.round((sum / period) * 10) / 10;
    });
  }

  calculateEMA(data: KlinePoint[], period: number): (number | null)[] {
    const result: (number | null)[] = [];
    const multiplier = 2 / (period + 1);

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push(null);
        continue;
      }

      if (i === period - 1) {
        const sum = data.slice(0, period).reduce((acc, d) => acc + d.score, 0);
        result.push(Math.round((sum / period) * 10) / 10);
        continue;
      }

      const prevEMA = result[i - 1]!;
      const ema = (data[i].score - prevEMA) * multiplier + prevEMA;
      result.push(Math.round(ema * 10) / 10);
    }

    return result;
  }

  getTrendStatus(currentScore: number, ma5: number | null, ma10: number | null): {
    status: 'bullish' | 'bearish' | 'neutral';
    signal: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
  } {
    if (ma5 === null || ma10 === null) {
      return { status: 'neutral', signal: 'hold' };
    }

    if (currentScore > ma5 && ma5 > ma10) {
      if (currentScore - ma10 > 15) return { status: 'bullish', signal: 'strong_buy' };
      return { status: 'bullish', signal: 'buy' };
    }

    if (currentScore < ma5 && ma5 < ma10) {
      if (ma10 - currentScore > 15) return { status: 'bearish', signal: 'strong_sell' };
      return { status: 'bearish', signal: 'sell' };
    }

    return { status: 'neutral', signal: 'hold' };
  }

  findCrossPoints(data: KlinePoint[], ma5: (number | null)[], ma10: (number | null)[]): Array<{
    index: number;
    type: 'golden_cross' | 'death_cross';
    age: number;
    year: number;
  }> {
    const crosses: Array<{
      index: number;
      type: 'golden_cross' | 'death_cross';
      age: number;
      year: number;
    }> = [];

    for (let i = 1; i < data.length; i++) {
      const prevMa5 = ma5[i - 1];
      const prevMa10 = ma10[i - 1];
      const currMa5 = ma5[i];
      const currMa10 = ma10[i];

      if (prevMa5 === null || prevMa10 === null || currMa5 === null || currMa10 === null) {
        continue;
      }

      if (prevMa5 <= prevMa10 && currMa5 > currMa10) {
        crosses.push({
          index: i,
          type: 'golden_cross',
          age: data[i].age,
          year: data[i].year,
        });
      } else if (prevMa5 >= prevMa10 && currMa5 < currMa10) {
        crosses.push({
          index: i,
          type: 'death_cross',
          age: data[i].age,
          year: data[i].year,
        });
      }
    }

    return crosses;
  }

  calculateFullMA(data: KlinePoint[]): MAData {
    const ma5 = this.calculateMA(data, 5);
    const ma10 = this.calculateMA(data, 10);

    const trendStatus = data.map((point, index) =>
      this.getTrendStatus(point.score, ma5[index], ma10[index])
    );

    const crossPoints = this.findCrossPoints(data, ma5, ma10);

    return { ma5, ma10, trend_status: trendStatus, cross_points: crossPoints };
  }
}
