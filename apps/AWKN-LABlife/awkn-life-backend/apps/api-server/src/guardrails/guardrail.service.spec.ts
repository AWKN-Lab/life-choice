import { Test, TestingModule } from '@nestjs/testing';
import { GuardrailService } from './guardrail.service';
import { ClassicValidatorService } from './classic-validator.service';

describe('GuardrailService - P-01~P-04 双层护栏', () => {
  let service: GuardrailService;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [GuardrailService, ClassicValidatorService],
    }).compile();
    service = moduleRef.get(GuardrailService);
  });

  afterAll(() => moduleRef.close());

  it('P-01: 拦截「一定/必定/百分之百」并替换', () => {
    const r = service.apply('你今年一定会升职，必定有贵人相助。');
    expect(r.violations.some((v) => v.rule === 'P-01')).toBe(true);
    expect(r.output).not.toMatch(/一定|必定/);
    expect(r.output).toContain('有较大可能');
  });

  it('P-02: 拦截疑似杜撰引用（非白名单）', () => {
    const r = service.apply('《某某秘籍》云：此命大富大贵。');
    expect(r.violations.some((v) => v.rule === 'P-02')).toBe(true);
    expect(r.blocked).toBe(true);
  });

  it('P-02: 放行白名单经典', () => {
    const r = service.apply('《滴天髓》云：能用财官，斯为大器。');
    expect(r.violations.some((v) => v.rule === 'P-02')).toBe(false);
  });

  it('P-03: 决策建议自动补全边界声明', () => {
    const r = service.apply('建议你近期低调行事，避免锋芒毕露。');
    expect(r.violations.some((v) => v.rule === 'P-03')).toBe(true);
    expect(r.output).toContain('决策参考');
  });

  it('P-03: 已有声明则不重复添加', () => {
    const input = '建议你近期低调行事。（以上为决策参考，请结合自身实际情况判断）';
    const r = service.apply(input);
    expect(r.violations.some((v) => v.rule === 'P-03')).toBe(false);
  });

  it('P-04: 拦截投资买卖建议', () => {
    const r = service.apply('明日可大胆买入，盘中加仓。');
    expect(r.violations.some((v) => v.rule === 'P-04')).toBe(true);
    expect(r.output).not.toMatch(/买入|加仓/);
    expect(r.blocked).toBe(true);
  });

  it('正常输出无违规', () => {
    const r = service.apply('从目前信息看，今年的事业运势整体向上。');
    expect(r.violations.length).toBe(0);
    expect(r.blocked).toBe(false);
  });
});
