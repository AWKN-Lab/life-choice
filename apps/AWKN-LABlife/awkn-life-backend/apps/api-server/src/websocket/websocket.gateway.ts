import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Inject, Optional, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DialogueService } from '../consult/dialogue/dialogue.service';
import { PrismaService } from '../prisma/prisma.service';

const localSocketOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5175',
  'http://localhost:5176',
  'http://127.0.0.1:5176',
  'http://localhost:5177',
  'http://127.0.0.1:5177',
  'http://localhost:5180',
  'http://127.0.0.1:5180',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:8081',
  'http://127.0.0.1:8081',
  'http://localhost:8085',
  'http://127.0.0.1:8085',
  'http://localhost:8086',
  'http://127.0.0.1:8086',
  'http://localhost:8087',
  'http://127.0.0.1:8087',
  'http://localhost:8088',
  'http://127.0.0.1:8088',
  'https://awkn.cn',
  'https://www.awkn.cn',
];
const socketOrigins = [
  ...new Set([
    ...(process.env.CORS_ORIGINS?.split(',').filter(Boolean) || []),
    ...localSocketOrigins,
  ]),
];

@WebSocketGateway({
  cors: {
    origin: socketOrigins,
    methods: ['GET', 'POST'],
  },
  namespace: '/ws',
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebsocketGateway.name);
  private clients: Map<string, { userId: string; authenticated: boolean }> = new Map();

  constructor(
    private readonly jwtService: JwtService,
    @Optional() @Inject(forwardRef(() => DialogueService))
    private readonly dialogueService?: DialogueService,
    @Optional() @Inject(PrismaService)
    private readonly prisma?: PrismaService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    this.clients.set(client.id, { userId: 'guest', authenticated: false });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.clients.delete(client.id);
  }

  @SubscribeMessage('ping')
  handlePing(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    return { event: 'pong', data: { timestamp: Date.now() } };
  }

  @SubscribeMessage('authenticate')
  handleAuthenticate(@MessageBody() data: { token: string }, @ConnectedSocket() client: Socket) {
    if (!data.token) {
      return { event: 'authenticated', data: { success: false, error: 'Token required' } };
    }

    try {
      if (this.jwtService) {
        const decoded = this.jwtService.verify(data.token);
        const userId = decoded.sub || decoded.userId || decoded.id;
        this.clients.set(client.id, { userId: String(userId), authenticated: true });
        client.join(`user:${userId}`);
        return { event: 'authenticated', data: { success: true, userId } };
      }
      this.clients.set(client.id, { userId: 'guest', authenticated: true });
      return { event: 'authenticated', data: { success: true } };
    } catch {
      return { event: 'authenticated', data: { success: false, error: 'Invalid token' } };
    }
  }

  sendProgressUpdate(sessionId: string, progress: number, message: string) {
    this.server.to(`session:${sessionId}`).emit('progress', {
      sessionId,
      progress,
      message,
      timestamp: Date.now(),
    });
  }

  sendResultUpdate(sessionId: string, result: any) {
    this.server.to(`session:${sessionId}`).emit('result', {
      sessionId,
      result,
      timestamp: Date.now(),
    });
  }

  sendErrorUpdate(sessionId: string, error: string) {
    this.server.to(`session:${sessionId}`).emit('error', {
      sessionId,
      error,
      timestamp: Date.now(),
    });
  }

  /**
   * P1-1: 流式 LLM token 推送
   * - sessionId 为空时 broadcast；否则定向到该 session room
   * - stage: 'judgment' | 'premise' | 'cost' | 'reasoning' | 'meta'
   */
  sendLLMToken(sessionId: string | null, payload: {
    recordId?: string;
    stage: 'judgment' | 'premise' | 'cost' | 'reasoning' | 'meta';
    token: string;
    content?: string;
    done?: boolean;
    provider?: string;
    error?: string;
  }) {
    const event = 'llm_token';
    const data = { sessionId, ...payload, timestamp: Date.now() };
    if (sessionId) {
      this.server.to(`session:${sessionId}`).emit(event, data);
    } else {
      this.server.emit(event, data);
    }
  }

  /**
   * P2-2: 蛐蛐代价提醒推送
   * - 定向推送到 session room
   */
  sendCostWarning(sessionId: string, payload: { type: string; text: string; recordId: string }) {
    this.server.to(`session:${sessionId}`).emit('cost_warning', {
      sessionId,
      ...payload,
      timestamp: Date.now(),
    });
  }

  /**
   * P2-3: 代价确认提示推送
   */
  sendCostConfirmationPrompt(sessionId: string, payload: { prompt: string; recordId: string }) {
    this.server.to(`session:${sessionId}`).emit('cost_confirmation_prompt', {
      sessionId,
      ...payload,
      timestamp: Date.now(),
    });
  }

  /**
   * P2-3: 代价确认结果推送
   */
  sendCostConfirmationResult(sessionId: string, payload: { confirmed: boolean; message: string; recordId: string }) {
    this.server.to(`session:${sessionId}`).emit('cost_confirmation_result', {
      sessionId,
      ...payload,
      timestamp: Date.now(),
    });
  }

  /**
   * P2-3: 接收用户代价确认回复
   */
  @SubscribeMessage('cost_confirmation_reply')
  handleCostConfirmationReply(@MessageBody() data: { sessionId: string; recordId: string; userRestatedCost: string }, @ConnectedSocket() client: Socket) {
    // 转发到 session room，由 consult service 处理
    this.server.to(`session:${data.sessionId}`).emit('cost_confirmation_reply', {
      ...data,
      timestamp: Date.now(),
    });
    return { event: 'cost_confirmation_reply_received', data: { success: true } };
  }

  // ─── P3-1 回访系统事件 ───

  /**
   * D5: 推送回访提醒到用户
   */
  sendFollowUpReminder(userId: string, payload: { recordId: string; question: string; scheduledAt: Date; followUpId: string }) {
    this.server.to(`user:${userId}`).emit('follow_up_reminder', {
      ...payload,
      timestamp: Date.now(),
    });
  }

  /**
   * D5: 接收客户端回访开始确认
   */
  @SubscribeMessage('follow_up_start')
  handleFollowUpStart(@MessageBody() data: { followUpId: string }, @ConnectedSocket() client: Socket) {
    this.logger.log(`[follow_up_start] followUpId=${data.followUpId} client=${client.id}`);
    return { event: 'follow_up_start_received', data: { success: true, followUpId: data.followUpId } };
  }

  // ─── P4-1 多轮对话事件 ───

  /**
   * F5: 推送对话状态变更
   */
  sendDialogueStateChange(dialogueId: string, previousState: string, newState: string) {
    this.server.to(`dialogue:${dialogueId}`).emit('state_change', {
      dialogueId,
      previousState,
      newState,
      timestamp: Date.now(),
    });
  }

  /**
   * F5: 推送张半山反问
   */
  sendClarifyingQuestion(dialogueId: string, question: string, node: number) {
    this.server.to(`dialogue:${dialogueId}`).emit('clarifying_question', {
      dialogueId,
      question,
      node,
      timestamp: Date.now(),
    });
  }

  /**
   * F5: 推送对话内流式 token
   */
  sendDialogueLLMToken(dialogueId: string, payload: {
    stage: 'judgment' | 'premise' | 'cost' | 'reasoning' | 'meta';
    token: string;
    done?: boolean;
  }) {
    this.server.to(`dialogue:${dialogueId}`).emit('dialogue_llm_token', {
      dialogueId,
      ...payload,
      timestamp: Date.now(),
    });
  }

  /**
   * F5: 推送对话结果
   */
  sendDialogueResult(dialogueId: string, result: any) {
    this.server.to(`dialogue:${dialogueId}`).emit('dialogue_result', {
      dialogueId,
      result,
      timestamp: Date.now(),
    });
  }

  /**
   * 2026-06-17: dialogue_join — 客户端加入对话 WS room
   * 没有这个处理器，客户端无法接收 dialogue:{id} room 中的事件推送
   */
  @SubscribeMessage('dialogue_join')
  handleDialogueJoin(@MessageBody() data: { dialogueId: string }, @ConnectedSocket() client: Socket) {
    const room = `dialogue:${data.dialogueId}`;
    client.join(room);
    this.logger.log(`[dialogue_join] client=${client.id} joined room=${room}`);
    return { event: 'dialogue_joined', data: { success: true, dialogueId: data.dialogueId } };
  }

  /**
   * 2026-06-17: dialogue_reply — 对接 DialogueService，WS 通道也能触发追问推进
   * 之前只是 log-only 桩，现在作为 REST 端点的 WS 代理
   */
  @SubscribeMessage('dialogue_reply')
  async handleDialogueReply(@MessageBody() data: { dialogueId: string; reply: string }, @ConnectedSocket() client: Socket) {
    this.logger.log(`[dialogue_reply] dialogueId=${data.dialogueId} client=${client.id}`);

    // P0 安全修复：校验客户端已认证
    const clientInfo = this.clients.get(client.id);
    if (!clientInfo || !clientInfo.authenticated) {
      return { event: 'dialogue_reply_received', data: { success: false, dialogueId: data.dialogueId, error: '未认证，请先发送 authenticate 消息' } };
    }

    // P0 安全修复：校验对话归属权
    if (this.prisma) {
      const dialogue = await this.prisma.consultDialogue.findUnique({
        where: { id: data.dialogueId },
        select: { userId: true },
      });
      if (!dialogue) {
        return { event: 'dialogue_reply_received', data: { success: false, dialogueId: data.dialogueId, error: '对话不存在' } };
      }
      if (dialogue.userId !== clientInfo.userId) {
        this.logger.warn(`[dialogue_reply] ownership denied: client userId=${clientInfo.userId} != dialogue userId=${dialogue.userId}`);
        return { event: 'dialogue_reply_received', data: { success: false, dialogueId: data.dialogueId, error: '无权操作此对话' } };
      }
    }

    if (this.dialogueService) {
      try {
        await this.dialogueService.advanceDialogue(data.dialogueId, data.reply, clientInfo.userId);
        return { event: 'dialogue_reply_received', data: { success: true, dialogueId: data.dialogueId } };
      } catch (err) {
        this.logger.warn(`[dialogue_reply] advanceDialogue failed: ${(err as Error).message}`);
        return { event: 'dialogue_reply_received', data: { success: false, dialogueId: data.dialogueId, error: (err as Error).message } };
      }
    }

    return { event: 'dialogue_reply_received', data: { success: true, dialogueId: data.dialogueId } };
  }

  /**
   * F5: 接收用户取消对话
   */
  @SubscribeMessage('dialogue_cancel')
  handleDialogueCancel(@MessageBody() data: { dialogueId: string }, @ConnectedSocket() client: Socket) {
    this.logger.log(`[dialogue_cancel] dialogueId=${data.dialogueId} client=${client.id}`);
    return { event: 'dialogue_cancel_received', data: { success: true, dialogueId: data.dialogueId } };
  }
}
