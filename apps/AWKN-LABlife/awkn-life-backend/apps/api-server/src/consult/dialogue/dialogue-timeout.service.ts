import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WebsocketGateway } from '../../websocket/websocket.gateway';

@Injectable()
export class DialogueTimeoutService {
  private readonly logger = new Logger(DialogueTimeoutService.name);
  private static readonly TIMEOUT_MINUTES = 3;
  private static readonly SCAN_INTERVAL_MS = 5 * 60 * 1000; // 5 分钟
  private intervalId: NodeJS.Timeout | null = null;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(WebsocketGateway) private readonly websocketGateway: WebsocketGateway,
  ) {}

  /**
   * 启动定时扫描
   */
  start() {
    if (this.intervalId) return;
    this.logger.log('[DialogueTimeout] 启动定时扫描（每 5 分钟）');
    this.intervalId = setInterval(() => this.scan().catch(err => {
      this.logger.error(`[DialogueTimeout] 扫描失败: ${err.message}`);
    }), DialogueTimeoutService.SCAN_INTERVAL_MS);
  }

  /**
   * 停止定时扫描
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.logger.log('[DialogueTimeout] 已停止定时扫描');
    }
  }

  /**
   * 扫描并清理卡死的对话
   */
  async scan() {
    const cutoff = new Date(Date.now() - DialogueTimeoutService.TIMEOUT_MINUTES * 60 * 1000);

    // 查找 GENERATING 状态且超过阈值的对话
    const stuckDialogues = await this.prisma.consultDialogue.findMany({
      where: {
        state: 'GENERATING',
        updatedAt: { lt: cutoff },
      },
      select: { id: true, userId: true, updatedAt: true },
    });

    if (stuckDialogues.length === 0) return;

    this.logger.warn(`[DialogueTimeout] 发现 ${stuckDialogues.length} 个卡死的对话（GENERATING > ${DialogueTimeoutService.TIMEOUT_MINUTES}分钟）`);

    for (const dialogue of stuckDialogues) {
      try {
        // 回退到 IDLE 状态
        await this.prisma.consultDialogue.update({
          where: { id: dialogue.id },
          data: { state: 'IDLE' },
        });

        // 通知前端对话已中断
        this.websocketGateway.server.to(`dialogue:${dialogue.id}`).emit('dialogue_timeout', {
          dialogueId: dialogue.id,
          message: '对话生成超时，已自动重置。请重新发送消息继续对话。',
          timestamp: Date.now(),
        });

        this.logger.log(`[DialogueTimeout] 对话 ${dialogue.id} 已回退到 IDLE（卡死 ${Math.round((Date.now() - dialogue.updatedAt.getTime()) / 1000)}秒）`);
      } catch (err) {
        this.logger.error(`[DialogueTimeout] 回退对话 ${dialogue.id} 失败: ${(err as Error).message}`);
      }
    }
  }
}
