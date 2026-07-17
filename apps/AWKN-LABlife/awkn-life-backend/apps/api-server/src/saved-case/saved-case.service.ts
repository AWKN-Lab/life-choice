import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateSavedCaseDto,
  UpdateSavedCaseDto,
  ListSavedCasesQueryDto,
} from './dto';

@Injectable()
export class SavedCaseService {
  private readonly logger = new Logger(SavedCaseService.name);
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 列表查询 — 把 query 参数转成 Prisma findMany 的 args
   * TODO: 实现 _buildListArgs —— 见下方说明
   */
  /**
   * 列表查询 — 把 query 参数转成 Prisma findMany 的 args
   * 详见 {@link _buildListArgs} 与 docs/decisions/001-savedcase-list-defaults.md
   */
  async list(userId: string, query: ListSavedCasesQueryDto) {
    const args = this._buildListArgs(userId, query);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.savedCase.findMany(args),
      this.prisma.savedCase.count({ where: args.where }),
    ]);
    return {
      items: items.map((c) => this.formatCase(c)),
      meta: {
        total,
        limit: args.take ?? 20,
        offset: args.skip ?? 0,
        hasMore: (args.skip ?? 0) + items.length < total,
      },
    };
  }

  async create(userId: string, dto: CreateSavedCaseDto) {
    const created = await this.prisma.savedCase.create({
      data: {
        userId,
        recordId: dto.recordId,
        name: dto.name,
        category: dto.category,
        tags: JSON.stringify(dto.tags ?? []),
        notes: dto.notes,
        snapshot: JSON.stringify(dto.snapshot ?? {}),
        visibility: dto.visibility ?? 'private',
      },
    });
    return this.formatCase(created);
  }

  async getOne(userId: string, id: string) {
    const savedCase = await this.prisma.savedCase.findUnique({
      where: { id },
    });
    if (!savedCase) {
      throw new NotFoundException('命例不存在');
    }
    // 只能看自己的 + 公开的
    if (savedCase.userId !== userId && savedCase.visibility !== 'public') {
      throw new ForbiddenException('无权访问此命例');
    }
    return this.formatCase(savedCase);
  }

  async update(userId: string, id: string, dto: UpdateSavedCaseDto) {
    // 先校验所有权
    const existing = await this.prisma.savedCase.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('命例不存在');
    }
    if (existing.userId !== userId) {
      throw new ForbiddenException('只能修改自己的命例');
    }

    // 只把 dto 里实际传入的字段写入（避免 tags: undefined 覆盖已有值）
    const data: Prisma.SavedCaseUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.tags !== undefined) data.tags = JSON.stringify(dto.tags);
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.snapshot !== undefined) data.snapshot = JSON.stringify(dto.snapshot);
    if (dto.visibility !== undefined) data.visibility = dto.visibility;

    const updated = await this.prisma.savedCase.update({
      where: { id },
      data,
    });
    return this.formatCase(updated);
  }

  async remove(userId: string, id: string) {
    const existing = await this.prisma.savedCase.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('命例不存在');
    }
    if (existing.userId !== userId) {
      throw new ForbiddenException('只能删除自己的命例');
    }
    this.logger.log(`[P0-8-AUDIT] savedCase.delete pending: id=${id} userId=${userId} name=${existing.name}`);
    await this.prisma.savedCase.delete({ where: { id } });
    this.logger.log(`[P0-8-AUDIT] savedCase.delete executed: id=${id} userId=${userId}`);
    return { id, deleted: true };
  }

  /**
   * 构建 Prisma findMany 参数。
   *
   * 产品决策（详见 docs/decisions/001-savedcase-list-defaults.md）：
   * - 默认 20 条/页（不传 limit 时）
   * - 按 createdAt desc 排序（最新的在前）
   * - scope 语义：private=只看我私有；public=只看公开池；all=我的全部+所有人公开
   * - category 精确匹配（命理分类是受控词汇，非模糊搜索）
   */
  private _buildListArgs(
    userId: string,
    query: ListSavedCasesQueryDto,
  ): Prisma.SavedCaseFindManyArgs {
    const take = query.limit ?? 20;
    const skip = query.offset ?? 0;

    // scope → visibility 过滤
    // private = 只看自己私有的
    // public  = 只看公开案例池（所有人的）
    // all     = 自己的（含私有）+ 所有人公开的 — 轻量发现机制
    let visibilityFilter: Prisma.SavedCaseWhereInput;
    switch (query.scope) {
      case 'private':
        visibilityFilter = { userId, visibility: 'private' };
        break;
      case 'public':
        visibilityFilter = { visibility: 'public' };
        break;
      case 'all':
      default:
        visibilityFilter = {
          OR: [
            { userId },               // 自己的全部（含 private + public）
            { visibility: 'public' }, // 别人公开的
          ],
        };
        break;
    }

    // category = 精确匹配（命理分类是受控词汇，非自由文本）
    const where: Prisma.SavedCaseWhereInput = {
      ...visibilityFilter,
      ...(query.category ? { category: query.category } : {}),
    };

    return {
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    };
  }

  /** 把 DB 行的 JSON 字符串字段解析回对象 */
  private formatCase(row: {
    id: string;
    userId: string;
    recordId: string | null;
    name: string;
    category: string | null;
    tags: string;
    notes: string | null;
    snapshot: string;
    visibility: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      ...row,
      tags: safeJsonParse(row.tags, []),
      snapshot: safeJsonParse(row.snapshot, {}),
    };
  }
}

function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}
