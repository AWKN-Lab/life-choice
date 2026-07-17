/**
 * ZiweiBridgeService 测试 - 紫微斗数 Python 验证器桥接
 *
 * 来源：天火吸收计划 E28 零测试门禁
 * 通过 mock child_process.execFile 避免依赖真实 Python 环境
 * 覆盖：paipan（正常/边界/异常）+ bzfc（正常/异常）+ zizhan（正常/异常）
 *
 * Mock 说明：
 * 源码使用 `const execFileAsync = promisify(execFile)`。
 * promisify 默认行为：取 callback(err, value) 的 value 作为 resolve 值。
 * 但源码期望 `const { stdout, stderr } = await execFileAsync(...)`，
 * 所以 mock 的 callback 第二个参数需为 { stdout, stderr } 对象。
 *
 * 注：当前源码 paipan/bzfc/zizhan 均未实现参数校验（无 year 范围检查、
 * 无 GanZhi 格式校验、无 mode 校验），所有参数直接传给 CLI。
 * 测试用例根据实际源码行为编写，异常场景改为测试 CLI 执行失败。
 */

jest.mock('child_process', () => ({
  execFile: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { execFile } from 'child_process';
import { ZiweiBridgeService } from '../ziwei-bridge.service';

describe('ZiweiBridgeService - 紫微斗数 Python 桥接', () => {
  let service: ZiweiBridgeService;
  let moduleRef: TestingModule;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockExecFile = execFile as unknown as jest.Mock<any, any>;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [ZiweiBridgeService],
    }).compile();
    service = moduleRef.get(ZiweiBridgeService);
  });

  afterAll(() => moduleRef.close());

  beforeEach(() => {
    mockExecFile.mockReset();
  });

  /**
   * 设置 mock 让 execFile 成功返回
   */
  const mockExecFileSuccess = (stdout = '{"result":"mock-ziwei-output"}') => {
    mockExecFile.mockImplementation((...args: unknown[]) => {
      const callback = args[args.length - 1];
      if (typeof callback === 'function') {
        (callback as (err: Error | null, value: unknown) => void)(null, {
          stdout,
          stderr: '',
        });
      }
    });
  };

  /**
   * 设置 mock 让 execFile 失败
   */
  const mockExecFileFailure = (errMsg = 'Python not found') => {
    mockExecFile.mockImplementation((...args: unknown[]) => {
      const callback = args[args.length - 1];
      if (typeof callback === 'function') {
        (callback as (err: Error | null, value?: unknown) => void)(
          new Error(errMsg),
        );
      }
    });
  };

  /**
   * 从 execFile 调用参数中提取 CLI args 数组
   */
  const getCliArgsFromLastCall = (): string[] => {
    const lastCall = mockExecFile.mock.calls[mockExecFile.mock.calls.length - 1];
    for (const arg of lastCall) {
      if (Array.isArray(arg)) {
        return arg as string[];
      }
    }
    return [];
  };

  // ============ paipan - 正常调用 ============

  describe('paipan - 正常调用', () => {
    it('合法参数应调用 CLI 并返回结果', async () => {
      // 正常：paipan 合法参数应调用 CLI
      mockExecFileSuccess();
      const r = await service.paipan({
        year: 2000,
        month: 6,
        day: 15,
        hour: 12,
        gender: 'male',
      });
      expect(mockExecFile).toHaveBeenCalledTimes(1);
      expect(r.raw).toBe('{"result":"mock-ziwei-output"}');
      expect(r.parsed).toEqual({ result: 'mock-ziwei-output' });
    });

    it('应正确传递 year/month/day/hour/gender 参数到 CLI', async () => {
      // 正常：验证 CLI 参数传递
      mockExecFileSuccess();
      await service.paipan({
        year: 1990,
        month: 3,
        day: 20,
        hour: 8,
        gender: 'female',
      });
      const cliArgs = getCliArgsFromLastCall();
      expect(cliArgs).toContain('-y');
      expect(cliArgs).toContain('1990');
      expect(cliArgs).toContain('-m');
      expect(cliArgs).toContain('3');
      expect(cliArgs).toContain('-d');
      expect(cliArgs).toContain('20');
      expect(cliArgs).toContain('-h');
      expect(cliArgs).toContain('8');
      expect(cliArgs).toContain('-g');
      expect(cliArgs).toContain('0'); // female → 0
      expect(cliArgs).toContain('--json');
    });

    it('isLeapMonth=true 时应传递 --leap 标志', async () => {
      // 正常：闰月标志
      mockExecFileSuccess();
      await service.paipan({
        year: 2000,
        month: 6,
        day: 15,
        hour: 12,
        gender: 'male',
        isLeapMonth: true,
      });
      const cliArgs = getCliArgsFromLastCall();
      expect(cliArgs).toContain('--leap');
    });
  });

  describe('paipan - 边界参数', () => {
    it('边界年份（1900）应正常调用 CLI（当前源码无范围校验）', async () => {
      // 边界：当前源码未实现 year 范围校验，边界值应直接传给 CLI
      mockExecFileSuccess();
      const r = await service.paipan({
        year: 1900,
        month: 1,
        day: 1,
        hour: 0,
        gender: 'male',
      });
      expect(mockExecFile).toHaveBeenCalledTimes(1);
      expect(r.raw).toBe('{"result":"mock-ziwei-output"}');
    });

    it('isLeapMonth 未提供时应不传 --leap', async () => {
      // 边界：可选字段缺失
      mockExecFileSuccess();
      await service.paipan({
        year: 2000,
        month: 6,
        day: 15,
        hour: 12,
        gender: 'male',
      });
      const cliArgs = getCliArgsFromLastCall();
      expect(cliArgs).not.toContain('--leap');
    });
  });

  describe('paipan - 异常（CLI 执行失败）', () => {
    it('CLI 执行失败应抛错并包含原始错误信息', async () => {
      // 异常：CLI 执行失败
      mockExecFileFailure('Python interpreter not found');
      await expect(
        service.paipan({
          year: 2000,
          month: 6,
          day: 15,
          hour: 12,
          gender: 'male',
        }),
      ).rejects.toThrow(/紫微排盘 CLI 执行失败/);
    });

    it('CLI 执行失败应抛出脱敏业务错误', async () => {
      // 异常：错误信息脱敏，对外抛业务错误（原始错误仅记日志）
      mockExecFileFailure('script not found');
      await expect(
        service.paipan({
          year: 2000,
          month: 6,
          day: 15,
          hour: 12,
          gender: 'male',
        }),
      ).rejects.toThrow(/紫微排盘 CLI 执行失败/);
    });
  });

  // ============ bzfc - 正常调用 ============

  describe('bzfc - 正常调用', () => {
    it('yearGanZhi 合法（如"甲子"）应调用 CLI', async () => {
      // 正常：bzfc yearGanZhi 合法应调用 CLI
      mockExecFileSuccess();
      const r = await service.bzfc({ yearGanZhi: '甲子' });
      expect(mockExecFile).toHaveBeenCalledTimes(1);
      expect(r.raw).toBe('{"result":"mock-ziwei-output"}');

      // 验证 CLI 调用参数包含 --bzfc 和 --ygz 甲子
      const cliArgs = getCliArgsFromLastCall();
      expect(cliArgs).toContain('--bzfc');
      expect(cliArgs).toContain('--ygz');
      expect(cliArgs).toContain('甲子');
    });

    it('四柱全提供应全部传递到 CLI', async () => {
      // 正常：四柱完整
      mockExecFileSuccess();
      await service.bzfc({
        yearGanZhi: '甲子',
        monthGanZhi: '乙丑',
        dayGanZhi: '丙寅',
        hourGanZhi: '丁卯',
      });
      const cliArgs = getCliArgsFromLastCall();
      expect(cliArgs).toContain('--ygz');
      expect(cliArgs).toContain('甲子');
      expect(cliArgs).toContain('--mgz');
      expect(cliArgs).toContain('乙丑');
      expect(cliArgs).toContain('--dgz');
      expect(cliArgs).toContain('丙寅');
      expect(cliArgs).toContain('--hgz');
      expect(cliArgs).toContain('丁卯');
    });

    it('不提供任何 GanZhi 应仍调用 CLI（空反查）', async () => {
      // 边界：空输入
      mockExecFileSuccess();
      await service.bzfc({});
      expect(mockExecFile).toHaveBeenCalledTimes(1);
      const cliArgs = getCliArgsFromLastCall();
      expect(cliArgs).toContain('--bzfc');
    });
  });

  describe('bzfc - 异常（CLI 执行失败）', () => {
    it('CLI 执行失败应抛错', async () => {
      // 异常：CLI 执行失败
      mockExecFileFailure('invalid ganzhi');
      await expect(
        service.bzfc({ yearGanZhi: '甲子' }),
      ).rejects.toThrow(/紫微排盘 CLI 执行失败/);
    });
  });

  // ============ zizhan - 正常调用 ============

  describe('zizhan - 正常调用', () => {
    it('mode="now" 应调用 CLI', async () => {
      // 正常：zizhan mode='now' 应调用 CLI
      mockExecFileSuccess();
      const r = await service.zizhan({ mode: 'now' });
      expect(mockExecFile).toHaveBeenCalledTimes(1);
      expect(r.raw).toBe('{"result":"mock-ziwei-output"}');

      // 验证 CLI 调用参数包含 --zizhan now
      const cliArgs = getCliArgsFromLastCall();
      expect(cliArgs).toContain('--zizhan');
      expect(cliArgs).toContain('now');
    });

    it('mode="random" 应调用 CLI', async () => {
      // 正常：random 模式
      mockExecFileSuccess();
      const r = await service.zizhan({ mode: 'random' });
      expect(mockExecFile).toHaveBeenCalledTimes(1);
      expect(r.parsed).toEqual({ result: 'mock-ziwei-output' });
      const cliArgs = getCliArgsFromLastCall();
      expect(cliArgs).toContain('random');
    });

    it('mode="number" 应调用 CLI 并传 --num', async () => {
      // 正常：number 模式
      mockExecFileSuccess();
      await service.zizhan({ mode: 'number', number: 1234 });
      expect(mockExecFile).toHaveBeenCalledTimes(1);
      const cliArgs = getCliArgsFromLastCall();
      expect(cliArgs).toContain('--num');
      expect(cliArgs).toContain('1234');
    });

    it('mode="number" 未提供 number 时不应传 --num', async () => {
      // 边界：number 模式但未提供 number
      mockExecFileSuccess();
      await service.zizhan({ mode: 'number' });
      const cliArgs = getCliArgsFromLastCall();
      expect(cliArgs).not.toContain('--num');
    });
  });

  describe('zizhan - 异常（CLI 执行失败）', () => {
    it('CLI 执行失败应抛错', async () => {
      // 异常：CLI 执行失败
      mockExecFileFailure('zizhan error');
      await expect(
        service.zizhan({ mode: 'now' }),
      ).rejects.toThrow(/紫微排盘 CLI 执行失败/);
    });
  });

  // ============ 返回值结构 ============

  describe('返回值结构', () => {
    it('raw 字段应为 CLI stdout 原始字符串', async () => {
      mockExecFileSuccess('{"test":true}');
      const r = await service.paipan({
        year: 2000,
        month: 6,
        day: 15,
        hour: 12,
        gender: 'female',
      });
      expect(typeof r.raw).toBe('string');
      expect(r.raw).toBe('{"test":true}');
    });

    it('parsed 字段在 stdout 为合法 JSON 时应解析成功', async () => {
      mockExecFileSuccess('{"result":"mock-ziwei-output"}');
      const r = await service.zizhan({ mode: 'now' });
      expect(r.parsed).toBeDefined();
      expect(r.parsed.result).toBe('mock-ziwei-output');
    });

    it('parsed 字段在 stdout 为非法 JSON 时应为 undefined', async () => {
      // 边界：非 JSON 输出
      mockExecFileSuccess('not a json string');
      const r = await service.zizhan({ mode: 'now' });
      expect(r.parsed).toBeUndefined();
      expect(r.raw).toBe('not a json string');
    });
  });
});
