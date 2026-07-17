/**
 * preflight-check.js — 启动前校验（P0-3 Step3）
 *
 * 职责（在 bootstrap spawn main.js 之前执行）：
 * 1. 校验 .env.prod 存在且非空（生产环境）
 * 2. 校验关键环境变量非空（DATABASE_URL/JWT_SECRET/DEFAULT_LLM_PROVIDER/对应API Key）
 * 3. 校验 dist/assets-manifest.json 中 required=true 的所有文件存在
 * 4. 校验 Python CLI（若 ZIWEI_CLI_PATH 设置则检查文件存在+可执行）
 * 5. 校验 knowledge-service（127.0.0.1:8701）可达（3s 超时，不可达设降级标志位）
 * 6. 任何 required 校验失败 → 返回 false（bootstrap 会 process.exit(1)）
 *
 * 接入方式：bootstrap-production.js 在 ensureAssets() 后调用
 *   const preflightOk = require('./preflight-check.js')();
 *   if (!preflightOk) { process.exit(1); }
 *
 * 跳过方式：SKIP_PREFLIGHT=1（仅紧急情况）
 *
 * 返回值：true=通过，false=失败
 */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');

const SKIP = process.env.SKIP_PREFLIGHT === '1';
if (SKIP) {
  console.log('[preflight] SKIP_PREFLIGHT=1, skipping all checks');
  module.exports = () => true;
  return;
}

const apiServerRoot = path.resolve(__dirname, '..');
const distRoot = path.join(apiServerRoot, 'dist');
const manifestPath = path.join(apiServerRoot, 'assets-manifest.json');

const errors = [];
const warnings = [];
const degraded = [];

function logOk(msg) { console.log(`[preflight] OK ${msg}`); }
function logWarn(msg) { warnings.push(msg); console.warn(`[preflight] WARN ${msg}`); }
function logError(msg) { errors.push(msg); console.error(`[preflight] FAIL ${msg}`); }

function checkEnvProd() {
  const envProdPath = path.join(apiServerRoot, '.env.prod');
  const envProdPathRoot = path.join(apiServerRoot, '..', '.env.prod');

  if (!fs.existsSync(envProdPath) && !fs.existsSync(envProdPathRoot)) {
    logError('.env.prod not found (checked: ' + envProdPath + ' and ' + envProdPathRoot + ')');
    return false;
  }

  const foundPath = fs.existsSync(envProdPath) ? envProdPath : envProdPathRoot;
  const content = fs.readFileSync(foundPath, 'utf-8');
  if (!content.trim()) {
    logError('.env.prod is empty: ' + foundPath);
    return false;
  }

  logOk('.env.prod found: ' + foundPath);
  return true;
}

function checkCriticalEnvVars() {
  if (!fs.existsSync(manifestPath)) {
    logError('assets-manifest.json not found');
    return;
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const criticalVars = manifest.criticalEnvVars || [];

  for (const entry of criticalVars) {
    const value = process.env[entry.name];
    if (!value || !value.trim()) {
      if (entry.required) {
        logError(`env ${entry.name} is empty (${entry.note})`);
      } else {
        logWarn(`env ${entry.name} is empty (${entry.note}) — will degrade`);
        degraded.push(entry.name);
      }
    } else {
      logOk(`env ${entry.name} = *** (${entry.note})`);
    }
  }

  // 额外校验：DEFAULT_LLM_PROVIDER 与对应 API Key 的一致性
  const defaultProvider = process.env.DEFAULT_LLM_PROVIDER;
  if (defaultProvider) {
    const providerKeyMap = {
      'deepseek-direct': 'DEEPSEEK_DIRECT_API_KEY',
      'sensenova': 'SENSENOVA_API_KEY',
      'doubao': 'DOUBAO_API_KEY',
      'minimax': 'MINIMAX_API_KEY',
      'deepseek': 'DEEPSEEK_API_KEY',
      'spark': 'SPARK_API_KEY',
    };
    const expectedKey = providerKeyMap[defaultProvider];
    if (expectedKey && !process.env[expectedKey]) {
      logError(`DEFAULT_LLM_PROVIDER=${defaultProvider} but ${expectedKey} is empty`);
    } else if (expectedKey) {
      logOk(`DEFAULT_LLM_PROVIDER=${defaultProvider} → ${expectedKey} configured`);
    }
  }
}

function checkAssets() {
  if (!fs.existsSync(distRoot)) {
    logError('dist/ not found. Run "npm run build" first.');
    return;
  }

  if (!fs.existsSync(manifestPath)) {
    logError('assets-manifest.json not found');
    return;
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  // 校验 dirs
  for (const entry of manifest.dirs) {
    const distPath = path.join(distRoot, entry.dest);
    if (!fs.existsSync(distPath)) {
      if (entry.required) {
        logError(`asset dir missing: ${entry.dest}`);
      } else {
        logWarn(`optional asset dir missing: ${entry.dest} — will degrade`);
        degraded.push(entry.dest);
      }
    } else {
      // 检查目录非空
      const files = listFilesRecursive(distPath);
      if (files.length === 0) {
        if (entry.required) {
          logError(`asset dir empty: ${entry.dest}`);
        } else {
          logWarn(`optional asset dir empty: ${entry.dest} — will degrade`);
          degraded.push(entry.dest);
        }
      } else {
        logOk(`asset dir: ${entry.dest} (${files.length} files)`);
      }
    }
  }

  // 校验 files
  for (const entry of manifest.files) {
    const distPath = path.join(distRoot, entry.dest);
    if (!fs.existsSync(distPath)) {
      if (entry.required) {
        logError(`asset file missing: ${entry.dest}`);
      } else {
        logWarn(`optional asset file missing: ${entry.dest} — will degrade`);
        degraded.push(entry.dest);
      }
    } else {
      logOk(`asset file: ${entry.dest}`);
    }
  }

  // 校验 dataDirs（在 dist 外，相对路径解析）
  for (const entry of manifest.dataDirs) {
    const resolvedPath = path.resolve(distRoot, entry.dest);
    if (!fs.existsSync(resolvedPath)) {
      if (entry.required) {
        logError(`dataDir missing: ${entry.dest} (resolved: ${resolvedPath})`);
      } else {
        logWarn(`optional dataDir missing: ${entry.dest} — will degrade`);
        degraded.push(entry.dest);
      }
    } else {
      logOk(`dataDir: ${entry.dest}`);
    }
  }
}

function listFilesRecursive(dir) {
  const result = [];
  if (!fs.existsSync(dir)) return result;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...listFilesRecursive(fullPath));
    } else if (entry.isFile()) {
      result.push(fullPath);
    }
  }
  return result;
}

function checkPythonCli() {
  const cliPath = process.env.ZIWEI_CLI_PATH;
  if (!cliPath) {
    logWarn('ZIWEI_CLI_PATH not set — ziwei-agent will degrade to iztro JS library');
    degraded.push('pythonCli');
    return;
  }

  if (!fs.existsSync(cliPath)) {
    logError(`ZIWEI_CLI_PATH points to non-existent file: ${cliPath}`);
    return;
  }

  // 检查可执行权限（Linux）
  try {
    fs.accessSync(cliPath, fs.constants.X_OK);
    logOk(`Python CLI executable: ${cliPath}`);
  } catch (e) {
    // Windows 下 X_OK 检查不可靠，只要文件存在即可
    if (process.platform === 'win32') {
      logOk(`Python CLI exists: ${cliPath} (Windows, skip X_OK check)`);
    } else {
      logError(`Python CLI not executable: ${cliPath}`);
    }
  }
}

function checkKnowledgeService() {
  return new Promise((resolve) => {
    const baseUrl = process.env.KNOWLEDGE_SERVICE_URL || 'http://127.0.0.1:8701';
    const url = new URL('/health', baseUrl);
    const timeout = 3000;

    const req = http.get(url, { timeout }, (res) => {
      if (res.statusCode === 200) {
        logOk(`knowledge-service reachable at ${baseUrl}`);
        resolve(true);
      } else {
        logWarn(`knowledge-service returned ${res.statusCode} at ${baseUrl} — will degrade`);
        degraded.push('knowledgeService');
        resolve(false);
      }
      res.resume();
    });

    req.on('error', (e) => {
      logWarn(`knowledge-service unreachable at ${baseUrl}: ${e.message} — will degrade`);
      degraded.push('knowledgeService');
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      logWarn(`knowledge-service timeout at ${baseUrl} (3s) — will degrade`);
      degraded.push('knowledgeService');
      resolve(false);
    });
  });
}

async function runChecks() {
  console.log('========================================');
  console.log('[preflight] Starting preflight checks...');
  console.log('========================================');

  // 1. .env.prod 校验
  checkEnvProd();

  // 2. 关键环境变量校验
  checkCriticalEnvVars();

  // 3. Assets 文件校验
  checkAssets();

  // 4. Python CLI 校验
  checkPythonCli();

  // 5. knowledge-service 校验（异步）
  await checkKnowledgeService();

  // 设置降级标志位（供 /health/ready 读取）
  if (degraded.length > 0) {
    for (const d of degraded) {
      process.env[`DEGRADED_${d.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`] = 'true';
    }
    console.log(`[preflight] Degraded features: ${degraded.join(', ')}`);
  }

  console.log('========================================');
  if (errors.length > 0) {
    console.error(`[preflight] FAILED: ${errors.length} errors, ${warnings.length} warnings`);
    errors.forEach(e => console.error(`  ${e}`));
    return false;
  }
  if (warnings.length > 0) {
    console.log(`[preflight] PASSED WITH DEGRADATIONS: ${warnings.length} warnings, ${degraded.length} degraded`);
  } else {
    console.log(`[preflight] ALL CHECKS PASSED`);
  }
  return true;
}

// 导出函数，供 bootstrap 调用
module.exports = function preflightCheck() {
  // 用同步方式包装（bootstrap 是同步的，knowledge-service 检查用 promise 但不阻塞）
  // 实际上需要 async，但 bootstrap 调用点需要调整
  // 这里改为同步检查 + 异步检查分离
  return runChecksSync();
};

// 同步版本（knowledge-service 检查改为非阻塞探测，不等待结果）
function runChecksSync() {
  console.log('========================================');
  console.log('[preflight] Starting preflight checks...');
  console.log('========================================');

  checkEnvProd();
  checkCriticalEnvVars();
  checkAssets();
  checkPythonCli();

  // knowledge-service 检查（非阻塞，只设标志位）
  const baseUrl = process.env.KNOWLEDGE_SERVICE_URL || 'http://127.0.0.1:8701';
  const url = new URL('/health', baseUrl);
  const req = http.get(url, { timeout: 3000 }, (res) => {
    if (res.statusCode === 200) {
      console.log(`[preflight] OK knowledge-service reachable at ${baseUrl}`);
    } else {
      console.warn(`[preflight] WARN knowledge-service returned ${res.statusCode} — will degrade`);
      process.env.DEGRADED_KNOWLEDGE_SERVICE = 'true';
    }
    res.resume();
  });
  req.on('error', () => {
    console.warn(`[preflight] WARN knowledge-service unreachable at ${baseUrl} — will degrade`);
    process.env.DEGRADED_KNOWLEDGE_SERVICE = 'true';
  });
  req.on('timeout', () => {
    req.destroy();
    console.warn(`[preflight] WARN knowledge-service timeout (3s) — will degrade`);
    process.env.DEGRADED_KNOWLEDGE_SERVICE = 'true';
  });

  // 设置降级标志位
  if (degraded.length > 0) {
    for (const d of degraded) {
      process.env[`DEGRADED_${d.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`] = 'true';
    }
    console.log(`[preflight] Degraded features: ${degraded.join(', ')}`);
  }

  console.log('========================================');
  if (errors.length > 0) {
    console.error(`[preflight] FAILED: ${errors.length} errors, ${warnings.length} warnings`);
    errors.forEach(e => console.error(`  ${e}`));
    return false;
  }
  if (warnings.length > 0) {
    console.log(`[preflight] PASSED WITH DEGRADATIONS: ${warnings.length} warnings, ${degraded.length} degraded`);
  } else {
    console.log(`[preflight] ALL CHECKS PASSED`);
  }
  return true;
}
