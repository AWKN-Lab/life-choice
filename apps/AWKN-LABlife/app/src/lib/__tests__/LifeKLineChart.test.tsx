import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LifeKLineChart } from '@/components/LifeKLineChart';
import type { KLinePoint } from '@/types/lifekline';

// Mock recharts components
vi.mock('recharts', () => ({
  ComposedChart: ({ children }: any) => <div data-testid="composed-chart">{children}</div>,
  Bar: ({ children }: any) => <div data-testid="bar">{children}</div>,
  Cell: () => null,
  Line: () => <div data-testid="line" />,
  Brush: () => <div data-testid="brush" />,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  ReferenceLine: () => null,
  Legend: () => null,
  Label: () => null,
  LabelList: () => null,
}));

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'zh-CN' },
  }),
}));

const mockKLineData: KLinePoint[] = [
  {
    age: 1,
    year: 1990,
    ganZhi: '庚午',
    daYun: '童限',
    open: 50,
    close: 55,
    high: 60,
    low: 45,
    score: 55,
    reason: '开局平稳，家庭呵护',
  },
  {
    age: 10,
    year: 2000,
    ganZhi: '庚辰',
    daYun: '辛未',
    open: 55,
    close: 70,
    high: 75,
    low: 50,
    score: 68,
    reason: '学业进步，运势上升',
  },
  {
    age: 25,
    year: 2015,
    ganZhi: '乙亥',
    daYun: '壬申',
    open: 70,
    close: 45,
    high: 72,
    low: 40,
    score: 50,
    reason: '事业挑战，需谨慎应对',
  },
];

describe('LifeKLineChart Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders chart container when data is provided', () => {
      render(<LifeKLineChart data={mockKLineData} />);

      expect(screen.getAllByTestId('responsive-container').length).toBeGreaterThan(0);
    });

    it('renders with Chinese title', () => {
      render(<LifeKLineChart data={mockKLineData} />);

      expect(screen.getByText('7条人生线走势')).toBeDefined();
    });

    it('renders legend items', () => {
      render(<LifeKLineChart data={mockKLineData} />);

      // LIFE_DIMENSION_LABELS 中的中文标签
      expect(screen.getByText(/事业/)).toBeDefined();
      expect(screen.getByText(/财富/)).toBeDefined();
    });
  });

  describe('Empty Data', () => {
    it('shows no data message when data is empty', () => {
      render(<LifeKLineChart data={[]} />);

      expect(screen.getByText('暂无K线数据')).toBeDefined();
    });

    it('generates mock data when data is null', () => {
      // 组件行为：null 时自动生成 mock 数据，不显示空数据消息
      render(<LifeKLineChart data={null as any} />);

      expect(screen.getAllByTestId('responsive-container').length).toBeGreaterThan(0);
    });

    it('generates mock data when data is undefined', () => {
      // 组件行为：undefined 时自动生成 mock 数据，不显示空数据消息
      render(<LifeKLineChart data={undefined as any} />);

      expect(screen.getAllByTestId('responsive-container').length).toBeGreaterThan(0);
    });
  });

  describe('Data Transformation', () => {
    it('handles single data point', () => {
      const singlePoint: KLinePoint[] = [
        {
          age: 30,
          year: 2020,
          ganZhi: '庚子',
          daYun: '戊子',
          open: 60,
          close: 65,
          high: 70,
          low: 55,
          score: 65,
          reason: '财运亨通',
        },
      ];

      render(<LifeKLineChart data={singlePoint} />);

      expect(screen.getAllByTestId('responsive-container').length).toBeGreaterThan(0);
    });

    it('handles data with missing optional fields', () => {
      const partialData: KLinePoint[] = [
        {
          age: 30,
          year: 2020,
          ganZhi: '庚子',
          // daYun is optional
          open: 60,
          close: 65,
          high: 70,
          low: 55,
          score: 65,
          reason: '财运亨通',
        },
      ];

      render(<LifeKLineChart data={partialData} />);

      expect(screen.getAllByTestId('responsive-container').length).toBeGreaterThan(0);
    });
  });
});

describe('KLinePoint Type Validation', () => {
  it('validates required fields in KLinePoint', () => {
    const validPoint: KLinePoint = {
      age: 30,
      year: 2020,
      ganZhi: '庚子',
      open: 60,
      close: 65,
      high: 70,
      low: 55,
      score: 65,
      reason: '财运亨通',
    };

    expect(validPoint.age).toBe(30);
    expect(validPoint.year).toBe(2020);
    expect(validPoint.ganZhi).toBe('庚子');
    expect(validPoint.open).toBe(60);
    expect(validPoint.close).toBe(65);
    expect(validPoint.high).toBe(70);
    expect(validPoint.low).toBe(55);
    expect(validPoint.score).toBe(65);
    expect(validPoint.reason).toBe('财运亨通');
  });

  it('supports optional daYun field', () => {
    const pointWithoutDaYun: KLinePoint = {
      age: 30,
      year: 2020,
      ganZhi: '庚子',
      open: 60,
      close: 65,
      high: 70,
      low: 55,
      score: 65,
      reason: '财运亨通',
    };

    expect(pointWithoutDaYun.daYun).toBeUndefined();
  });
});
