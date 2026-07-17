/**
 * L2.2 工程测试用例 T8 — 主动回访
 *
 * 对应 line-02-pipeline.md 第 152 行：
 *   T8: 主动回访（合同前 1 天提醒 3 件事）
 *
 * 验证点：
 * - FollowupService.scheduleFollowUp 能创建回访记录
 * - CALLBACK_ENABLED=true 时才执行调度
 * - 回访记录写入 ConsultFollowUp 表
 * - BullMQ 队列收到任务
 *
 * 说明：
 * - "合同前 1 天提醒 3 件事"的具体业务逻辑（计算合同日期、生成3件事清单）
 *   尚未实现，scheduleFollowUp 目前是通用延迟回访
 * - 使用真实 FollowupService + mock 依赖
 */

import { FollowupService } from '../followup/followup.service';
import {
  createMockPrismaService,
  createMockUserMemoryService,
  createMockWebsocketGateway,
  createMockQueue,
} from './test-helpers';

describe('T8 — 主动回访：合同前 1 天提醒 3 件事', () => {
  let followupService: FollowupService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockMemory: ReturnType<typeof createMockUserMemoryService>;
  let mockWs: ReturnType<typeof createMockWebsocketGateway>;
  let mockQueue: ReturnType<typeof createMockQueue>;
  let mockLlm: any;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    // test-helpers 的 mock 未包含 updateMany，按需补充
    (mockPrisma.consultFollowUp as any).updateMany = jest.fn().mockResolvedValue({ count: 1 });
    mockMemory = createMockUserMemoryService();
    mockWs = createMockWebsocketGateway();
    mockQueue = createMockQueue();
    mockLlm = { chatStream: jest.fn(), chatCheap: jest.fn() };

    const mockContextBuilder = { buildContext: jest.fn().mockResolvedValue([]) };
    followupService = new FollowupService(
      mockPrisma as any,
      mockLlm as any,
      mockMemory as any,
      mockWs as any,
      mockQueue as any,
      mockContextBuilder as any,
    );
  });

  describe('Given CALLBACK_ENABLED=true', () => {
    beforeEach(() => {
      process.env.CALLBACK_ENABLED = 'true';
    });

    afterEach(() => {
      delete process.env.CALLBACK_ENABLED;
    });

    it('When 调用 scheduleFollowUp → Then 创建 ConsultFollowUp 记录', async () => {
      mockPrisma.consultFollowUp.create.mockResolvedValue({
        id: 'followup-1',
        recordId: 'record-1',
        userId: 'user-1',
        scheduledAt: new Date('2026-06-26'),
        status: 'pending',
      });

      const result = await followupService.scheduleFollowUp('record-1', 'user-1', 7);

      expect(result).not.toBeNull();
      expect(result!.id).toBe('followup-1');
      expect(mockPrisma.consultFollowUp.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            recordId: 'record-1',
            userId: 'user-1',
            status: 'pending',
          }),
        }),
      );
    });

    it('When 调用 scheduleFollowUp(delayDays=7) → Then scheduledAt 为 7 天后', async () => {
      mockPrisma.consultFollowUp.create.mockImplementation((args: any) =>
        Promise.resolve({
          id: 'followup-1',
          ...args.data,
        }),
      );

      const before = Date.now();
      const result = await followupService.scheduleFollowUp('record-1', 'user-1', 7);
      const after = Date.now();

      const scheduledTime = new Date(result!.scheduledAt).getTime();
      const expectedMin = before + 7 * 24 * 60 * 60 * 1000;
      const expectedMax = after + 7 * 24 * 60 * 60 * 1000;

      expect(scheduledTime).toBeGreaterThanOrEqual(expectedMin);
      expect(scheduledTime).toBeLessThanOrEqual(expectedMax);
    });

    it('When 调用 scheduleFollowUp → Then 入队 BullMQ', async () => {
      mockPrisma.consultFollowUp.create.mockResolvedValue({
        id: 'followup-1',
        recordId: 'record-1',
        userId: 'user-1',
        scheduledAt: new Date(),
        status: 'pending',
      });

      await followupService.scheduleFollowUp('record-1', 'user-1', 7);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-followup-reminder',
        { followUpId: 'followup-1', recordId: 'record-1', userId: 'user-1' },
        expect.objectContaining({
          delay: 7 * 24 * 60 * 60 * 1000,
        }),
      );
    });

    it('When BullMQ 入队失败 → Then 仅写 DB 不抛错', async () => {
      mockPrisma.consultFollowUp.create.mockResolvedValue({
        id: 'followup-1',
        recordId: 'record-1',
        userId: 'user-1',
        scheduledAt: new Date(),
        status: 'pending',
      });
      mockQueue.add.mockRejectedValue(new Error('Redis connection failed'));

      // 不应抛错
      const result = await followupService.scheduleFollowUp('record-1', 'user-1', 7);
      expect(result).not.toBeNull();
      expect(result!.id).toBe('followup-1');
    });
  });

  describe('Given CALLBACK_ENABLED 未设置', () => {
    beforeEach(() => {
      delete process.env.CALLBACK_ENABLED;
    });

    it('When 调用 scheduleFollowUp → Then 跳过（返回 null）', async () => {
      const result = await followupService.scheduleFollowUp('record-1', 'user-1', 7);
      expect(result).toBeNull();
      expect(mockPrisma.consultFollowUp.create).not.toHaveBeenCalled();
    });
  });

  describe('Given 查询待完成回访', () => {
    it('When 调用 getPendingFollowUps → Then 返回 status=sent 的记录', async () => {
      const mockFollowUps = [
        {
          id: 'fu-1',
          recordId: 'r-1',
          userId: 'user-1',
          status: 'sent',
          scheduledAt: new Date('2026-06-10'),
          completedAt: null,
          record: { id: 'r-1', question: '合同要不要签', routeType: 'mixed', summaryLine: '宜签', createdAt: new Date('2026-06-01') },
        },
      ];
      mockPrisma.consultFollowUp.findMany.mockResolvedValue(mockFollowUps);

      const result = await followupService.getPendingFollowUps('user-1');

      expect(result).toEqual(mockFollowUps);
      expect(mockPrisma.consultFollowUp.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            status: 'sent',
            completedAt: null,
          }),
        }),
      );
    });
  });

  describe('Given 完成回访', () => {
    it('When 调用 completeFollowUp → Then 更新状态为 completed', async () => {
      (mockPrisma.consultFollowUp as any).updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.consultRecord.update.mockResolvedValue({ id: 'r-1' });

      const result = await followupService.completeFollowUp('r-1', {
        userReflection: '合同签了',
        actualOutcome: '顺利签约',
        accuracyCheck: '判断准确',
      });

      expect(result.updated).toBe(1);
      expect((mockPrisma.consultFollowUp as any).updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { recordId: 'r-1', status: 'sent' },
          data: expect.objectContaining({
            status: 'completed',
          }),
        }),
      );
    });
  });

  describe('Given "合同前 1 天提醒 3 件事"具体逻辑', () => {
    // 当前 scheduleFollowUp 是通用延迟回访，不包含：
    //   1. 计算合同签订日期前 1 天的精确触发时间
    //   2. 生成"3 件事"清单（如：确认条款/准备证件/预留资金）
    //   3. 基于 record.question 内容生成个性化提醒
    // 这些逻辑尚未实现，标记 skip

    /**
     * SKIP 原因：当前 scheduleFollowUp 是通用延迟回访，不包含：
     *             1. 计算合同签订日期前 1 天的精确触发时间
     *             2. 生成"3 件事"清单（如：确认条款/准备证件/预留资金）
     *             3. 基于 record.question 内容生成个性化提醒
     *           这些逻辑尚未实现为独立可测服务。
     * 保留策略：保留 skip。本用例对应 line-02-pipeline.md T8 设计用例的"最后一公里"，
     *           底层回访调度能力已由上方 it 覆盖并通过，删除会丢失设计意图文档化。
     * 解除条件：followup 实现场景识别 + 3 件事清单生成 + 个性化提醒独立服务。
     * TODO: 待 followup 内容生成逻辑实现后补全断言
     * 负责人: L2-pipeline 维护者（待认领）
     * 关联文档: docs/03开发过程稿/已完成执行计划/line-02-pipeline.md T8
     *
     * 预期行为：
     *   1. 从 record.question 识别"合同"场景
     *   2. 生成 3 件事清单
     *   3. 通过 WebSocket 推送结构化提醒
     */
    it.skip('When 合同咨询 + 7 天后回访 → Then 提醒"3件事：确认条款/准备证件/预留资金"', () => {
      // 占位：待 followup 内容生成服务实现后补全断言
    });
  });
});
