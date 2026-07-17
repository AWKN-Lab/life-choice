const fs = require('fs');
const path = require('path');
const { spawnSync, spawn } = require('child_process');
const dotenv = require('dotenv');

const projectRoot = path.resolve(__dirname, '..');
const apiServerRoot = path.join(projectRoot, 'apps', 'api-server');
const primaryEnvPath = path.join(projectRoot, '.env');
const fallbackEnvPath = path.join(apiServerRoot, '.env');
// P0-1 修复 (2026-06-26): 生产环境权威配置，最后加载并覆盖开发环境值
// 修复前：只加载 .env，导致生产用开发环境的欠费 doubao key（403 AccountOverdue）
// 修复后：.env.prod 优先覆盖，确保生产用 DEEPSEEK_DIRECT_API_KEY + SENSENOVA_API_KEY
const prodEnvPath = path.join(apiServerRoot, '.env.prod');
const prodEnvPathRoot = path.join(projectRoot, '.env.prod');
const apiEntry = path.join(apiServerRoot, 'dist', 'main.js');
const ensureAdminScript = path.join(apiServerRoot, 'scripts', 'ensure-admin.js');
const defaultSqliteDbPath = path.join(apiServerRoot, 'prisma', 'dev.db');

// 需要复制到 dist 的 assets 目录清单（相对于 apiServerRoot/src 和 dist）
// nest build 在 v11 下不复制 assets，这里做兜底（2026-06-17 P0-1 修复）
const ASSETS_DIRS = [
  'calc-engine/data',
  'consult/orchestrator/rules',
  'liuren-agent/prompts',
  'liuyao-agent/prompts',
  'qimen-agent/prompts',
  'quming-agent/prompts',
  'shared/prompts',
  'shared/rule-engine/rules',
  'ziping-agent/prompts',
  'ziwei-agent/prompts',
  'knowledge-base/liuren',
];

// 单文件 assets（相对于 apiServerRoot/src 和 dist）
const ASSETS_FILES = [
  'consult/safety/scenario-rules.yaml',
];

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const parsed = dotenv.parse(fs.readFileSync(filePath));
  for (const [key, value] of Object.entries(parsed)) {
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

/**
 * P0-1 修复 (2026-06-26): 生产环境强制覆盖加载
 * 与 loadEnvFile 不同，此函数会强制覆盖 process.env 中已有的值
 * 专门用于 .env.prod —— 生产环境权威配置必须胜出
 * 注意：DATABASE_URL 在下方会被强制统一，此处不特殊处理
 */
function loadEnvFileOverride(filePath, label) {
  if (!fs.existsSync(filePath)) {
    console.warn(`[bootstrap] ${label} not found, skip: ${filePath}`);
    return false;
  }

  const parsed = dotenv.parse(fs.readFileSync(filePath));
  let overridden = 0;
  for (const [key, value] of Object.entries(parsed)) {
    const oldValue = process.env[key];
    if (oldValue !== undefined && oldValue !== value) {
      console.log(`[bootstrap] ${label} 覆盖 ${key}: ${oldValue ? '***' : '(empty)'} → ${value ? '***' : '(empty)'}`);
      overridden++;
    }
    process.env[key] = value;
  }
  console.log(`[bootstrap] ${label} loaded: ${Object.keys(parsed).length} keys, ${overridden} overridden`);
  return true;
}

function resolveDatabaseUrl(databaseUrl) {
  if (!databaseUrl || !databaseUrl.startsWith('file:')) {
    return databaseUrl;
  }

  const sqlitePath = databaseUrl.slice('file:'.length);
  if (!sqlitePath || path.isAbsolute(sqlitePath)) {
    return databaseUrl;
  }

  return `file:${path.resolve(apiServerRoot, sqlitePath).replace(/\\/g, '/')}`;
}

function ensureAdmin() {
  if (!process.env.ADMIN_PASSWORD) {
    console.warn('[bootstrap] ADMIN_PASSWORD not set, skipping admin ensure');
    return;
  }

  const result = spawnSync(process.execPath, [ensureAdminScript], {
    cwd: apiServerRoot,
    stdio: 'inherit',
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function ensureAssets() {
  // 兜底：确保所有 assets（json/yaml/prompts/knowledge-base）复制到 dist 目录
  // nest build 在 v11 下不复制 assets，这里做全量复制（2026-06-17 P0-1 修复）
  let copiedDirs = 0;
  let copiedFiles = 0;

  for (const relPath of ASSETS_DIRS) {
    const srcPath = path.join(apiServerRoot, 'src', relPath);
    const distPath = path.join(apiServerRoot, 'dist', relPath);
    if (!fs.existsSync(srcPath)) {
      console.warn(`[bootstrap] assets src not found, skip: ${relPath}`);
      continue;
    }
    fs.mkdirSync(distPath, { recursive: true });
    fs.cpSync(srcPath, distPath, { recursive: true });
    copiedDirs++;
  }

  for (const relPath of ASSETS_FILES) {
    const srcPath = path.join(apiServerRoot, 'src', relPath);
    const distPath = path.join(apiServerRoot, 'dist', relPath);
    if (!fs.existsSync(srcPath)) {
      console.warn(`[bootstrap] assets file src not found, skip: ${relPath}`);
      continue;
    }
    fs.mkdirSync(path.dirname(distPath), { recursive: true });
    fs.copyFileSync(srcPath, distPath);
    copiedFiles++;
  }

  console.log(`[bootstrap] Copied ${copiedDirs} asset dirs + ${copiedFiles} files to dist`);
}

// P0-1 修复 (2026-06-26): 加载顺序 = 开发.env(兜底) → 生产.env.prod(强制覆盖)
// 这样确保生产环境的 API key、provider 配置胜出，不会被开发环境的欠费 key 污染
loadEnvFile(primaryEnvPath);
loadEnvFile(fallbackEnvPath);
const prodLoaded = loadEnvFileOverride(prodEnvPath, '.env.prod(api-server)')
  || loadEnvFileOverride(prodEnvPathRoot, '.env.prod(root)');

if (!prodLoaded) {
  console.error('[bootstrap][P0-1] ⚠️ .env.prod 未找到！生产环境必须提供 .env.prod 配置文件');
  console.error('[bootstrap][P0-1] 当前仍在加载开发环境 .env，LLM provider 可能不可用');
}

// 2026-06-17: 强制统一数据库路径 —— 无论 .env 写了什么，生产环境始终指向唯一正确的 db
const canonicalDbPath = defaultSqliteDbPath; // apps/api-server/prisma/dev.db
const canonicalDbUrl = `file:${canonicalDbPath.replace(/\\/g, '/')}`;

const envDbUrl = process.env.DATABASE_URL;
if (envDbUrl && envDbUrl !== canonicalDbUrl) {
  console.warn(`[bootstrap] DATABASE_URL 已强制修正: ${envDbUrl} → ${canonicalDbUrl}`);
}
process.env.DATABASE_URL = canonicalDbUrl;

console.log(`[bootstrap] DATABASE_URL=${process.env.DATABASE_URL}`);
ensureAdmin();
ensureAssets();

// P0-3 Step4 (2026-06-26): 启动前校验 —— 替代静默 fallback，关键 asset/env 缺失即拒绝启动
// preflight-check.js 校验 .env.prod + 关键 env + dist assets + Python CLI + knowledge-service
// 失败则 process.exit(1)，避免"假健康"服务上线
// 紧急情况可用 SKIP_PREFLIGHT=1 跳过
const preflightScript = path.join(__dirname, '..', 'apps', 'api-server', 'scripts', 'preflight-check.js');
if (fs.existsSync(preflightScript)) {
  console.log('[bootstrap] Running preflight checks...');
  const preflightOk = require(preflightScript)();
  if (!preflightOk) {
    console.error('[bootstrap] PREFLIGHT CHECK FAILED — refusing to start');
    console.error('[bootstrap] Set SKIP_PREFLIGHT=1 only for emergency bypass');
    process.exit(1);
  }
  console.log('[bootstrap] Preflight checks passed');
} else {
  console.warn(`[bootstrap] preflight-check.js not found at ${preflightScript}, skipping`);
}

const child = spawn(process.execPath, [apiEntry], {
  cwd: projectRoot,
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code || 0);
});
