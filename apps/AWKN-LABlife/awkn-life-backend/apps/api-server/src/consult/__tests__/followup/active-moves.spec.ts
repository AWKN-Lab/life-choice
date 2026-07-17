/**
 * P2-5: 10 场景主动出击测试
 *
 * 验证：
 * - 10 场景配置完整
 * - computeDelay 计算正确
 * - messageTemplate 非空
 */
import { ACTIVE_MOVE_SCENARIOS, ACTIVE_MOVE_SCENARIO_KEYS } from '../../followup/active-moves';

describe('Active Move Scenarios — 10 场景主动出击（P2-5）', () => {
  const EXPECTED_SCENARIOS = [
    'key_date_before',
    'contract_eve',
    'action_window',
    'cash_collect',
    'quarter_review',
    'annual_review',
    'new_window',
    'old_judgment_fix',
    'silent_user',
    'anniversary',
  ];

  it('10 场景全部定义', () => {
    expect(ACTIVE_MOVE_SCENARIO_KEYS).toHaveLength(10);
    for (const scenario of EXPECTED_SCENARIOS) {
      expect(ACTIVE_MOVE_SCENARIOS[scenario]).toBeDefined();
    }
  });

  it('所有场景都有 messageTemplate', () => {
    for (const key of ACTIVE_MOVE_SCENARIO_KEYS) {
      const scenario = ACTIVE_MOVE_SCENARIOS[key];
      expect(scenario.messageTemplate.length).toBeGreaterThan(5);
    }
  });

  it('所有场景都有 description', () => {
    for (const key of ACTIVE_MOVE_SCENARIO_KEYS) {
      const scenario = ACTIVE_MOVE_SCENARIOS[key];
      expect(scenario.description.length).toBeGreaterThan(3);
    }
  });

  describe('computeDelay — 延迟计算', () => {
    it('action_window → 3 天', () => {
      expect(ACTIVE_MOVE_SCENARIOS.action_window.computeDelay()).toBe(3);
    });

    it('cash_collect → 7 天', () => {
      expect(ACTIVE_MOVE_SCENARIOS.cash_collect.computeDelay()).toBe(7);
    });

    it('quarter_review → 90 天', () => {
      expect(ACTIVE_MOVE_SCENARIOS.quarter_review.computeDelay()).toBe(90);
    });

    it('annual_review → 365 天', () => {
      expect(ACTIVE_MOVE_SCENARIOS.annual_review.computeDelay()).toBe(365);
    });

    it('new_window → 14 天', () => {
      expect(ACTIVE_MOVE_SCENARIOS.new_window.computeDelay()).toBe(14);
    });

    it('old_judgment_fix → 30 天', () => {
      expect(ACTIVE_MOVE_SCENARIOS.old_judgment_fix.computeDelay()).toBe(30);
    });

    it('key_date_before 无 keyDate → 默认 1 天', () => {
      expect(ACTIVE_MOVE_SCENARIOS.key_date_before.computeDelay()).toBe(1);
    });

    it('key_date_before 有 keyDate（3 天后）→ 2 天后提醒', () => {
      const keyDate = new Date(Date.now() + 3 * 86400000);
      const delay = ACTIVE_MOVE_SCENARIOS.key_date_before.computeDelay({ keyDate });
      expect(delay).toBeGreaterThanOrEqual(1);
      expect(delay).toBeLessThanOrEqual(3);
    });

    it('contract_eve 无 contractDate → 默认 1 天', () => {
      expect(ACTIVE_MOVE_SCENARIOS.contract_eve.computeDelay()).toBe(1);
    });

    it('silent_user 无 lastActiveAt → 30 天', () => {
      expect(ACTIVE_MOVE_SCENARIOS.silent_user.computeDelay()).toBe(30);
    });

    it('anniversary → 365 天', () => {
      expect(ACTIVE_MOVE_SCENARIOS.anniversary.computeDelay()).toBe(365);
    });
  });
});
