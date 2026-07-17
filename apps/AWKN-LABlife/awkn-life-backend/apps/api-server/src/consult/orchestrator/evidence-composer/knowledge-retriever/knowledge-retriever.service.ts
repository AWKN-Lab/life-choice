/**
 * KnowledgeRetrieverService (L2)
 * 基于规则-知识绑定的静态检索器
 * - retrieve(): 返回非 disabled 的所有片段（含 confirmed + placeholder）
 * - retrieveConfirmed(): 只返回 confirmed 状态的片段，供 LLM 直接引用
 *
 * 数据来源：rule-knowledge-bindings.json（人工维护的 L2 绑定表）
 *
 * P0-5 修复（2026-07-04）：
 * - 启动预检 validateBindings()：所有 confirmed 片段必须有 sourceSha256 + edition
 * - 预检失败 → 阻断证据包启用（bindings 清空 + warn 日志）
 * - 运行时不再依赖 filePath 指向的外部文件，所有信息已内嵌
 */
import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { KnowledgeFragment } from '../evidence-composer.types';

type FragmentStatus = 'confirmed' | 'placeholder' | 'disabled';

interface BindingFragment {
  source: string;
  filePath: string;
  fragment: string;
  status: FragmentStatus;
  sourceSha256?: string;
  edition?: string;
}

interface RuleBinding {
  ruleId: string;
  fragments: BindingFragment[];
}

@Injectable()
export class KnowledgeRetrieverService {
  private readonly logger = new Logger(KnowledgeRetrieverService.name);
  private bindings: RuleBinding[] = [];
  /** P0-5: 预检是否通过。false 时 retrieve/retrieveConfirmed 返回空数组 */
  private validationPassed = false;

  constructor() {
    this.loadBindings();
    this.validateBindings();
  }

  private loadBindings(): void {
    const bindingPath = path.join(__dirname, 'rule-knowledge-bindings.json');
    if (fs.existsSync(bindingPath)) {
      const raw = fs.readFileSync(bindingPath, 'utf-8');
      this.bindings = JSON.parse(raw);
    }
  }

  /**
   * P0-5 启动预检：所有 confirmed 片段必须有 sourceSha256 + edition
   * 预检失败 → 阻断证据包启用（bindings 清空 + warn 日志）
   *
   * 完成标准：
   *   - 所有 confirmed 片段都有可验证来源、版本和 hash
   *   - 启动预检发现缺失时阻断证据包启用
   */
  private validateBindings(): void {
    if (this.bindings.length === 0) {
      this.logger.warn('[KnowledgeRetriever P0-5] bindings 为空，证据包禁用');
      this.validationPassed = false;
      return;
    }

    const missingSha256: string[] = [];
    const missingEdition: string[] = [];
    const hashMismatch: string[] = [];

    for (const rule of this.bindings) {
      for (const frag of rule.fragments) {
        if (frag.status !== 'confirmed') continue;

        const fragId = `${rule.ruleId}/${frag.source}`;
        if (!frag.sourceSha256) {
          missingSha256.push(fragId);
        } else {
          // 运行时重新计算 sha256 校验
          const computed = crypto.createHash('sha256').update(frag.fragment, 'utf-8').digest('hex');
          if (computed !== frag.sourceSha256) {
            hashMismatch.push(`${fragId} (expected=${frag.sourceSha256.slice(0, 8)}, actual=${computed.slice(0, 8)})`);
          }
        }

        if (!frag.edition) {
          missingEdition.push(fragId);
        }
      }
    }

    if (missingSha256.length > 0 || missingEdition.length > 0 || hashMismatch.length > 0) {
      this.logger.error(
        `[KnowledgeRetriever P0-5] 预检失败 → 阻断证据包启用。` +
        ` missingSha256=${missingSha256.length} (${missingSha256.slice(0, 3).join('; ')}...)` +
        ` missingEdition=${missingEdition.length}` +
        ` hashMismatch=${hashMismatch.length} (${hashMismatch.slice(0, 3).join('; ')}...)`,
      );
      this.bindings = [];
      this.validationPassed = false;
      return;
    }

    const confirmedCount = this.bindings.reduce(
      (sum, r) => sum + r.fragments.filter(f => f.status === 'confirmed').length,
      0,
    );
    this.logger.log(
      `[KnowledgeRetriever P0-5] 预检通过: ${this.bindings.length} rules, ${confirmedCount} confirmed fragments 全部带 sourceSha256+edition`,
    );
    this.validationPassed = true;
  }

  /**
   * 检索：返回 ruleIds 命中的所有非 disabled 片段
   * 用于 evidencePackage 内嵌，不直接喂 LLM
   *
   * P0-5: 预检未通过时返回空数组
   */
  retrieve(ruleIds: string[]): KnowledgeFragment[] {
    if (!this.validationPassed) {
      return [];
    }
    return this.bindings
      .filter(b => ruleIds.includes(b.ruleId))
      .map(b => ({
        ruleId: b.ruleId,
        fragments: b.fragments.filter(f => f.status !== 'disabled'),
      }));
  }

  /**
   * 只返回 confirmed 状态的片段（用于 LLM 引用）
   *
   * P0-5: 预检未通过时返回空数组
   */
  retrieveConfirmed(ruleIds: string[]): KnowledgeFragment[] {
    if (!this.validationPassed) {
      return [];
    }
    return this.bindings
      .filter(b => ruleIds.includes(b.ruleId))
      .map(b => ({
        ruleId: b.ruleId,
        fragments: b.fragments.filter(f => f.status === 'confirmed'),
      }))
      .filter(kf => kf.fragments.length > 0);
  }
}
