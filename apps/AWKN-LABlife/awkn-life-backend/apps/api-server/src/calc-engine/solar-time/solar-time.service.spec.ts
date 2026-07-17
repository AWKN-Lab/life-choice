import { Test, TestingModule } from '@nestjs/testing';
import { SolarTimeService } from './solar-time.service';

describe('SolarTimeService', () => {
  let service: SolarTimeService;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [SolarTimeService],
    }).compile();
    service = moduleRef.get(SolarTimeService);
  });

  afterAll(() => moduleRef.close());

  it('北京 2月12日 12:00 校正后应早于 12:00', () => {
    const std = new Date(2026, 1, 12, 12, 0, 0);
    const result = service.correct(std, 116.4074);
    expect(result.trueSolarTime.getHours()).toBe(11);
    expect(result.offsetMinutes).toBeLessThan(-20);
    expect(result.eotMinutes).toBeLessThan(-10);
  });

  it('上海 11月3日 12:00 校正后应晚于 12:00', () => {
    const std = new Date(2026, 10, 3, 12, 0, 0);
    const result = service.correct(std, 121.4737);
    expect(result.offsetMinutes).toBeGreaterThan(15);
    expect(result.eotMinutes).toBeGreaterThan(10);
  });

  it('correctByCity 北京应返回正确结果', () => {
    const std = new Date(2026, 1, 12, 12, 0, 0);
    const result = service.correctByCity(std, '北京市');
    expect(result).not.toBeNull();
    expect(result!.offsetMinutes).toBeLessThan(-20);
  });

  it('correctByCity 未知城市返回 null', () => {
    const result = service.correctByCity(new Date(), '火星市');
    expect(result).toBeNull();
  });

  it('listCities 应包含主要城市', () => {
    const cities = service.listCities();
    expect(cities).toContain('北京市');
    expect(cities).toContain('上海市');
    expect(cities).toContain('乌鲁木齐市');
    expect(cities.length).toBeGreaterThan(30);
  });

  it('description 应包含经度差和均时差信息', () => {
    const std = new Date(2026, 1, 12, 12, 0, 0);
    const result = service.correct(std, 116.4074);
    expect(result.description).toContain('经度差');
    expect(result.description).toContain('均时差');
  });
});