/**
 * YAML 规则加载器（学自真本事 rule_loader.py）
 *
 * 从 rules/scenario-rules.yaml 加载调度规则，支持热重载。
 * 替代 zhangbanshan-scheduler.service.ts 中的硬编码 SCENARIO_TYPES / CATEGORY_KEYWORDS
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { logger } from '../../logger';

export interface YamlScenario {
  id: number;
  name: string;
  keywords: string[];
  primary_agent: string;
  secondary_agent: string | null;
  clarifying_question: string;
  schedule_reason: string;
  priority: number;
}

export interface YamlClassification {
  type: string;
  keywords: string[];
}

export interface YamlComboMap {
  [category: string]: string;
}

export interface YamlToolCombo {
  name: string;
  description: string;
  category: string;
  tool_names: string[];
}

export interface ScenarioRules {
  scenarios: YamlScenario[];
  classifications: YamlClassification[];
  combo_map: YamlComboMap;
  tool_combos: YamlToolCombo[];
  birth_dependent_agents: string[];
}

const RULES_PATH = path.join(__dirname, 'rules', 'scenario-rules.yaml');
const RULES_PATH_CANDIDATES = [
  RULES_PATH,
  path.join(process.cwd(), 'src', 'consult', 'orchestrator', 'rules', 'scenario-rules.yaml'),
  path.join(process.cwd(), 'dist', 'consult', 'orchestrator', 'rules', 'scenario-rules.yaml'),
];

let cachedRules: ScenarioRules | null = null;
let lastLoadTime = 0;
const CACHE_TTL_MS = 60_000; // 1 分钟缓存

function resolveRulesPath(): string {
  const found = RULES_PATH_CANDIDATES.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    throw new Error(`scenario-rules.yaml not found. Tried: ${RULES_PATH_CANDIDATES.join(' | ')}`);
  }
  return found;
}

export function loadScenarioRules(forceReload = false): ScenarioRules {
  const now = Date.now();
  if (!forceReload && cachedRules && (now - lastLoadTime < CACHE_TTL_MS)) {
    return cachedRules;
  }

  try {
    const resolvedPath = resolveRulesPath();
    const content = fs.readFileSync(resolvedPath, 'utf-8');
    const parsed = yaml.load(content) as any;

    cachedRules = {
      scenarios: parsed.scenarios || [],
      classifications: parsed.classifications || [],
      combo_map: parsed.combo_map || {},
      tool_combos: parsed.tool_combos || [],
      birth_dependent_agents: parsed.birth_dependent_agents || [],
    };
    lastLoadTime = now;

    return cachedRules;
  } catch (err) {
    // YAML 加载失败时返回空规则（不阻塞服务）
    logger.error(`[ScenarioRulesLoader] Failed to load rules: ${(err as Error).message}`);
    return cachedRules || { scenarios: [], classifications: [], combo_map: {}, tool_combos: [], birth_dependent_agents: [] };
  }
}

export function reloadScenarioRules(): ScenarioRules {
  return loadScenarioRules(true);
}
