import { Injectable, Logger } from '@nestjs/common';
import { getTrueSolarTimeOffset, toTrueSolarTime } from '../eot/equation-of-time';

export interface SolarTimeResult {
  trueSolarTime: Date;
  offsetMinutes: number;
  longitudeOffsetMinutes: number;
  eotMinutes: number;
  description: string;
}

export const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  '北京市': { lat: 39.9042, lng: 116.4074 },
  '天津市': { lat: 39.3434, lng: 117.3616 },
  '上海市': { lat: 31.2304, lng: 121.4737 },
  '重庆市': { lat: 29.4316, lng: 106.9123 },
  '石家庄市': { lat: 38.0428, lng: 114.5149 },
  '太原市': { lat: 37.8706, lng: 112.5489 },
  '沈阳市': { lat: 41.8057, lng: 123.4315 },
  '长春市': { lat: 43.8171, lng: 125.3235 },
  '哈尔滨市': { lat: 45.8022, lng: 126.535 },
  '南京市': { lat: 32.0603, lng: 118.7969 },
  '杭州市': { lat: 30.2741, lng: 120.1551 },
  '合肥市': { lat: 31.8206, lng: 117.2272 },
  '福州市': { lat: 26.0745, lng: 119.2965 },
  '南昌市': { lat: 28.682, lng: 115.8582 },
  '济南市': { lat: 36.6512, lng: 117.1201 },
  '郑州市': { lat: 34.7466, lng: 113.6253 },
  '武汉市': { lat: 30.5928, lng: 114.3055 },
  '长沙市': { lat: 28.2282, lng: 112.9388 },
  '广州市': { lat: 23.1291, lng: 113.2644 },
  '南宁市': { lat: 22.817, lng: 108.3669 },
  '海口市': { lat: 20.044, lng: 110.199 },
  '成都市': { lat: 30.5728, lng: 104.0668 },
  '贵阳市': { lat: 26.647, lng: 106.6302 },
  '昆明市': { lat: 24.8801, lng: 102.8329 },
  '拉萨市': { lat: 29.65, lng: 91.1 },
  '西安市': { lat: 34.3416, lng: 108.9398 },
  '兰州市': { lat: 36.0611, lng: 103.8343 },
  '西宁市': { lat: 36.6171, lng: 101.7782 },
  '银川市': { lat: 38.4872, lng: 106.2309 },
  '乌鲁木齐市': { lat: 43.8256, lng: 87.6168 },
  '香港特别行政区': { lat: 22.3193, lng: 114.1694 },
  '澳门特别行政区': { lat: 22.1987, lng: 113.5439 },
  '台北市': { lat: 25.033, lng: 121.5654 },
};

@Injectable()
export class SolarTimeService {
  private readonly logger = new Logger(SolarTimeService.name);

  correct(standardTime: Date, longitude: number, standardMeridian = 120): SolarTimeResult {
    const longitudeOffset = (longitude - standardMeridian) * 4;
    const totalOffset = getTrueSolarTimeOffset(standardTime, longitude, standardMeridian);
    const eot = totalOffset - longitudeOffset;
    const trueSolar = toTrueSolarTime(standardTime, longitude, standardMeridian);
    return {
      trueSolarTime: trueSolar,
      offsetMinutes: Number(totalOffset.toFixed(2)),
      longitudeOffsetMinutes: Number(longitudeOffset.toFixed(2)),
      eotMinutes: Number(eot.toFixed(2)),
      description: '经度差 ' + longitudeOffset.toFixed(1) + ' 分钟 + 均时差 ' + eot.toFixed(1) + ' 分钟 = 总偏移 ' + totalOffset.toFixed(1) + ' 分钟',
    };
  }

  correctByCity(standardTime: Date, cityName: string): SolarTimeResult | null {
    const coords = CITY_COORDINATES[cityName];
    if (!coords) { this.logger.warn('城市 ' + cityName + ' 不在数据库中'); return null; }
    return this.correct(standardTime, coords.lng);
  }

  getCityCoords(cityName: string): { lat: number; lng: number } | null {
    return CITY_COORDINATES[cityName] || null;
  }

  listCities(): string[] { return Object.keys(CITY_COORDINATES); }
}