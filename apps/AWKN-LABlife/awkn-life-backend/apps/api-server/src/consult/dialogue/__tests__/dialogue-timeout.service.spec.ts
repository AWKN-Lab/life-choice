/**
 * DialogueTimeoutService 单元测试
 *
 * 覆盖：
 * - scan()：无卡死对话时不做任何操作
 * - scan()：发现卡死对话时回退到 IDLE
 * - scan()：发送 dialogue_timeout WS 事件
 * - start()：启动定时器
 * - stop()：停止定时器
 * - 超时阈值正确（3 分钟前的对话才被扫描）
 *
 * Mock 策略参考 dialogue.service.spec.ts，所有外部依赖均被 mock，不依赖真实数据库。
 */

import { Test, TestingModule } from '@nestjs/testing';
import { DialogueTimeoutService } from '../dialogue-timeout.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { WebsocketGateway } from '../../../websocket/websocket.gateway';

describe('DialogueTimeoutService', () => {
  let service: DialogueTimeoutService;
  let prisma: any;
  let websocketGateway: any;
  let emitMock: jest.Mock;

  beforeEach(async () => {
    emitMock = jest.fn();
    prisma = {
      consultDialogue: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };

    websocketGateway = {
      server: {
        to: jest.fn().mockReturnValue({ emit: emitMock }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DialogueTimeoutService,
        { provide: PrismaService, useValue: prisma },
        { provide: WebsocketGateway, useValue: websocketGateway },
      ],
    }).compile();

    service = module.get<DialogueTimeoutService>(DialogueTimeoutService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    // 确保每个用例后清理定时器，避免泄漏到下一个用例
    service.stop();
  });

  // ─── scan() ───

  describe('scan', () => {
    it('无卡死对话时不做任何操作', async () => {
      prisma.consultDialogue.findMany.mockResolvedValue([]);

      await service.scan();

      // 验证查询了卡死对话
      expect(prisma.consultDialogue.findMany).toHaveBeenCalledTimes(1);
      // 验证没有调用 update（无卡死对话）
      expect(prisma.consultDialogue.update).not.toHaveBeenCalled();
      // 验证没有发送 WS 事件
      expect(emitMock).not.toHaveBeenCalled();
    });

    it('发现卡死对话时回退到 IDLE', async () => {
      const stuckDialogue = {
        id: 'dialogue-stuck-1',
        userId: 'user-1',
        updatedAt: new Date(Date.now() - 5 * 60 * 1000), // 5 分钟前
      };
      prisma.consultDialogue.findMany.mockResolvedValue([stuckDialogue]);
      prisma.consultDialogue.update.mockResolvedValue({ ...stuckDialogue, state: 'IDLE' });

      await service.scan();

      // 验证调用了 update 回退到 IDLE
      expect(prisma.consultDialogue.update).toHaveBeenCalledTimes(1);
      expect(prisma.consultDialogue.update).toHaveBeenCalledWith({
        where: { id: 'dialogue-stuck-1' },
        data: { state: 'IDLE' },
      });
    });

    it('发送 dialogue_timeout WS 事件', async () => {
      const stuckDialogue = {
        id: 'dialogue-stuck-1',
        userId: 'user-1',
        updatedAt: new Date(Date.now() - 5 * 60 * 1000),
      };
      prisma.consultDialogue.findMany.mockResolvedValue([stuckDialogue]);
      prisma.consultDialogue.update.mockResolvedValue({ ...stuckDialogue, state: 'IDLE' });

      await service.scan();

      // 验证发送了 dialogue_timeout 事件到正确的 room
      expect(websocketGateway.server.to).toHaveBeenCalledWith('dialogue:dialogue-stuck-1');
      expect(emitMock).toHaveBeenCalledWith(
        'dialogue_timeout',
        expect.objectContaining({
          dialogueId: 'dialogue-stuck-1',
          message: '对话生成超时，已自动重置。请重新发送消息继续对话。',
        }),
      );
      // 验证 timestamp 是数字
      const callArgs = emitMock.mock.calls[0][1];
      expect(typeof callArgs.timestamp).toBe('number');
    });

    it('多个卡死对话时全部回退', async () => {
      const stuckDialogues = [
        { id: 'd1', userId: 'u1', updatedAt: new Date(Date.now() - 4 * 60 * 1000) },
        { id: 'd2', userId: 'u2', updatedAt: new Date(Date.now() - 6 * 60 * 1000) },
        { id: 'd3', userId: 'u3', updatedAt: new Date(Date.now() - 10 * 60 * 1000) },
      ];
      prisma.consultDialogue.findMany.mockResolvedValue(stuckDialogues);
      prisma.consultDialogue.update.mockResolvedValue({});

      await service.scan();

      // 验证 3 个对话都调用了 update
      expect(prisma.consultDialogue.update).toHaveBeenCalledTimes(3);
      expect(prisma.consultDialogue.update).toHaveBeenNthCalledWith(1, {
        where: { id: 'd1' },
        data: { state: 'IDLE' },
      });
      expect(prisma.consultDialogue.update).toHaveBeenNthCalledWith(2, {
        where: { id: 'd2' },
        data: { state: 'IDLE' },
      });
      expect(prisma.consultDialogue.update).toHaveBeenNthCalledWith(3, {
        where: { id: 'd3' },
        data: { state: 'IDLE' },
      });

      // 验证发送了 3 个 WS 事件
      expect(emitMock).toHaveBeenCalledTimes(3);
    });

    it('超时阈值正确（3 分钟前的对话才被扫描）', async () => {
      prisma.consultDialogue.findMany.mockResolvedValue([]);

      await service.scan();

      // 验证 findMany 的查询条件：updatedAt < (now - 3 分钟)
      const callArgs = prisma.consultDialogue.findMany.mock.calls[0][0];
      expect(callArgs.where.state).toBe('GENERATING');
      expect(callArgs.where.updatedAt).toBeDefined();
      expect(callArgs.where.updatedAt.lt).toBeDefined();

      // 验证 cutoff 时间约为 3 分钟前（允许 1 秒误差）
      const cutoff: Date = callArgs.where.updatedAt.lt;
      const expectedCutoffMs = Date.now() - 3 * 60 * 1000;
      expect(Math.abs(cutoff.getTime() - expectedCutoffMs)).toBeLessThan(1000);
    });

    it('单个对话回退失败时不影响其他对话', async () => {
      const stuckDialogues = [
        { id: 'd1', userId: 'u1', updatedAt: new Date(Date.now() - 4 * 60 * 1000) },
        { id: 'd2', userId: 'u2', updatedAt: new Date(Date.now() - 5 * 60 * 1000) },
      ];
      prisma.consultDialogue.findMany.mockResolvedValue(stuckDialogues);
      // 第一个对话 update 抛错，第二个成功
      prisma.consultDialogue.update
        .mockRejectedValueOnce(new Error('DB connection failed'))
        .mockResolvedValueOnce({});

      await service.scan();

      // 验证两个对话都尝试了 update
      expect(prisma.consultDialogue.update).toHaveBeenCalledTimes(2);
      // 验证第二个对话仍然发送了 WS 事件
      expect(emitMock).toHaveBeenCalledTimes(1);
      expect(emitMock).toHaveBeenCalledWith(
        'dialogue_timeout',
        expect.objectContaining({ dialogueId: 'd2' }),
      );
    });

    it('select 字段包含 id / userId / updatedAt', async () => {
      prisma.consultDialogue.findMany.mockResolvedValue([]);

      await service.scan();

      const callArgs = prisma.consultDialogue.findMany.mock.calls[0][0];
      expect(callArgs.select).toEqual({
        id: true,
        userId: true,
        updatedAt: true,
      });
    });
  });

  // ─── start() / stop() ───

  describe('start / stop', () => {
    it('start() 启动定时器', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval').mockReturnValue({} as any);

      service.start();

      // 验证调用了 setInterval
      expect(setIntervalSpy).toHaveBeenCalledTimes(1);
      // 验证间隔为 5 分钟（300000 ms）
      const callArgs = setIntervalSpy.mock.calls[0];
      expect(typeof callArgs[0]).toBe('function'); // 回调
      expect(callArgs[1]).toBe(5 * 60 * 1000);

      setIntervalSpy.mockRestore();
    });

    it('重复 start() 不会启动多个定时器', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval').mockReturnValue({} as any);

      service.start();
      service.start();
      service.start();

      expect(setIntervalSpy).toHaveBeenCalledTimes(1);

      setIntervalSpy.mockRestore();
    });

    it('stop() 停止定时器', () => {
      const fakeTimerId = { id: 'fake-timer' } as any;
      const setIntervalSpy = jest.spyOn(global, 'setInterval').mockReturnValue(fakeTimerId);
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      service.start();
      service.stop();

      // 验证调用了 clearInterval 并传入正确的 timer id
      expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
      expect(clearIntervalSpy).toHaveBeenCalledWith(fakeTimerId);

      setIntervalSpy.mockRestore();
      clearIntervalSpy.mockRestore();
    });

    it('未启动时 stop() 不报错', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      // 未调用 start() 直接调用 stop()，不应抛错
      expect(() => service.stop()).not.toThrow();
      expect(clearIntervalSpy).not.toHaveBeenCalled();

      clearIntervalSpy.mockRestore();
    });

    it('stop() 后可以重新 start()', () => {
      const fakeTimerId = { id: 'fake-timer' } as any;
      const setIntervalSpy = jest.spyOn(global, 'setInterval').mockReturnValue(fakeTimerId);
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      service.start();
      service.stop();
      service.start();

      // 验证 setInterval 被调用 2 次
      expect(setIntervalSpy).toHaveBeenCalledTimes(2);
      // 验证 clearInterval 被调用 1 次
      expect(clearIntervalSpy).toHaveBeenCalledTimes(1);

      setIntervalSpy.mockRestore();
      clearIntervalSpy.mockRestore();
    });
  });
});
