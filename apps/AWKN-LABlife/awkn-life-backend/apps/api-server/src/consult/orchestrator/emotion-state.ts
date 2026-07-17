/**
 * 3 维命理情绪系统（学自 awkn-agent 6 维情绪，适配命理场景）
 *
 * gravity（严肃度）：涉及生死/大病时升高
 * warmth（温度）：用户焦虑时升高，给出安慰
 * caution（谨慎度）：流年冲克严重时升高，语气更审慎
 */

export type EmotionEvent =
  | { type: 'user_anxious' }
  | { type: 'user_calm' }
  | { type: 'life_threatening' }
  | { type: 'major_clash' }
  | { type: 'smooth_flow' };

export class EmotionState {
  gravity: number;   // 严肃度 0-1
  warmth: number;    // 温度 0-1
  caution: number;   // 谨慎度 0-1

  constructor(gravity = 0.3, warmth = 0.5, caution = 0.4) {
    this.gravity = gravity;
    this.warmth = warmth;
    this.caution = caution;
  }

  applyEvent(event: EmotionEvent): void {
    switch (event.type) {
      case 'user_anxious':
        this.warmth = Math.min(1, this.warmth + 0.2);
        break;
      case 'user_calm':
        this.warmth = Math.max(0, this.warmth - 0.1);
        break;
      case 'life_threatening':
        this.gravity = Math.min(1, this.gravity + 0.4);
        this.warmth = Math.min(1, this.warmth + 0.3);
        break;
      case 'major_clash':
        this.caution = Math.min(1, this.caution + 0.3);
        break;
      case 'smooth_flow':
        this.caution = Math.max(0, this.caution - 0.1);
        break;
    }
  }

  applyCalcResult(calcResult: any): void {
    if (!calcResult) return;
    // 检测大凶格局
    if (calcResult.overallScore !== undefined && calcResult.overallScore < 30) {
      this.caution = Math.min(1, this.caution + 0.3);
    }
    // 检测冲克
    if (Array.isArray(calcResult.clashes) && calcResult.clashes.length > 0) {
      this.caution = Math.min(1, this.caution + 0.2);
    }
    // 检测健康相关
    if (calcResult.healthRisk) {
      this.gravity = Math.min(1, this.gravity + 0.3);
    }
  }

  toPromptInstruction(): string {
    const instructions: string[] = [];
    if (this.gravity > 0.6) instructions.push('语气更庄重，避免轻浮比喻');
    if (this.warmth > 0.6) instructions.push('先安抚再分析，给出希望感');
    if (this.caution > 0.6) instructions.push('强调不确定性，多用「可能」「倾向于」');
    if (this.gravity < 0.3 && this.caution < 0.3) instructions.push('语气可轻松些，适当用比喻');
    return instructions.join('；') || '保持沉稳中立';
  }

  decay(): void {
    this.gravity = Math.max(0.3, this.gravity - 0.05);
    this.warmth = Math.max(0.5, this.warmth - 0.05);
    this.caution = Math.max(0.4, this.caution - 0.05);
  }

  toJSON(): { gravity: number; warmth: number; caution: number } {
    return { gravity: this.gravity, warmth: this.warmth, caution: this.caution };
  }

  static fromJSON(data: { gravity: number; warmth: number; caution: number }): EmotionState {
    return new EmotionState(data.gravity, data.warmth, data.caution);
  }
}

/**
 * 从用户输入推断情绪事件（关键词匹配）
 */
export function inferEmotionFromInput(input: string): EmotionEvent[] {
  const events: EmotionEvent[] = [];
  const anxiousKeywords = ['害怕', '焦虑', '担心', '恐惧', '慌', '紧张', '不安', '崩溃', '绝望'];
  const calmKeywords = ['平静', '还好', '没事', '随便', '无所谓'];
  const lifeThreateningKeywords = ['大病', '绝症', '生死', '生命危险', '手术', '癌症'];

  for (const kw of anxiousKeywords) {
    if (input.includes(kw)) { events.push({ type: 'user_anxious' }); break; }
  }
  for (const kw of calmKeywords) {
    if (input.includes(kw)) { events.push({ type: 'user_calm' }); break; }
  }
  for (const kw of lifeThreateningKeywords) {
    if (input.includes(kw)) { events.push({ type: 'life_threatening' }); break; }
  }

  return events;
}
