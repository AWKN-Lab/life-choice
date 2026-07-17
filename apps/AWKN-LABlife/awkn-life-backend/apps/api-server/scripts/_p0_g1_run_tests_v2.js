// P0-G1 v2 完整接口实测脚本（按老板新规则）
// 测试 A(完整) / C(缺出生地) / D(无档案) / D0(管理员历史遗留)
// B(缺时辰) 跳过：birthHour+timeGanZhi 必填，无法真实建模
const BASE = 'http://localhost:30001/api/v1';

const USERS = {
  A:  { email: 'test-kline-a-full@example.com',    password: 'Test123456', label: '完整资料' },
  C:  { email: 'test-kline-c-no-city@example.com', password: 'Test123456', label: '缺出生地' },
  D:  { email: 'test-kline-d-no-profile@example.com', password: 'Test123456', label: '无BaZiProfile' },
  D0: { email: '10919669@qq.com',                  password: 'Admin123456', label: '管理员历史遗留(不动数据)' },
};

const ENDPOINTS = [
  { name: 'bars',           path: '/kline-tide/bars',           params: '?from=2024-01&to=2026-06' },
  { name: 'snapshots',      path: '/kline-tide/snapshots',      params: '?from=2024-01&to=2026-06' },
  { name: 'phase-points',   path: '/kline-tide/phase-points',   params: '?from=2024-01&to=2026-06' },
  { name: 'package',        path: '/kline-tide/package',        params: '?from=2024-01&to=2026-06' },
  { name: 'scores',         path: '/kline-tide/scores',         params: '' },
  { name: 'node-explanation', path: '/kline-tide/node-explanation', params: '?monthLabel=2026-06&compositeCapital=65' },
];

async function login(email, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  return { status: res.status, token: data.access_token || data.accessToken, raw: data };
}

async function callApi(token, path, params) {
  const url = `${BASE}${path}${params}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text.slice(0, 500); }
  return { status: res.status, data, url };
}

function detectMockSource(data, endpointName) {
  const sources = [];
  if (!data || typeof data !== 'object') return sources;

  // _seedKlineBars: 30 条带 compositeCapital
  if (Array.isArray(data.klineBars) && data.klineBars.length >= 30) {
    sources.push(`_seedKlineBars(${data.klineBars.length}条)`);
  }
  if (Array.isArray(data) && endpointName === 'bars' && data.length >= 30) {
    sources.push(`_seedKlineBars(${data.length}条)`);
  }

  // _seedStateSnapshots: 30 条 12 维
  if (Array.isArray(data.stateSnapshots) && data.stateSnapshots.length >= 30) {
    sources.push(`_seedStateSnapshots(${data.stateSnapshots.length}条)`);
  }
  if (Array.isArray(data) && endpointName === 'snapshots' && data.length >= 30) {
    sources.push(`_seedStateSnapshots(${data.length}条)`);
  }

  // kline-scoring fallback
  if (data.source === 'fallback') sources.push('kline-scoring fallback');

  // node-explanation: source=llm vs fallback
  if (data.source === 'llm') sources.push('真实LLM(DeepSeek)');
  if (data.source === 'fallback' && endpointName === 'node-explanation') sources.push('node-explanation fallback');

  if (data.gated) sources.push(`gated=${data.gated}`);
  if (data.meta?.note) sources.push(`meta.note=${String(data.meta.note).slice(0, 60)}`);

  return sources.length > 0 ? sources : ['无标记(需代码追踪)'];
}

function summarizeData(data, endpointName) {
  if (!data || typeof data !== 'object') return { type: typeof data, preview: String(data).slice(0, 200) };
  if (Array.isArray(data)) {
    return {
      type: 'array', length: data.length,
      firstItemKeys: data[0] ? Object.keys(data[0]).slice(0, 15) : [],
      firstItemPreview: data[0] ? JSON.stringify(data[0]).slice(0, 400) : null,
    };
  }
  const keys = Object.keys(data);
  const result = { type: 'object', keys: keys.slice(0, 20) };
  if (data.klineBars) result.klineBarsLen = data.klineBars.length;
  if (data.stateSnapshots) result.stateSnapshotsLen = data.stateSnapshots.length;
  if (data.phasePoints) result.phasePointsLen = data.phasePoints.length;
  if (data.meta) result.metaNote = String(data.meta.note || '').slice(0, 100);
  if (data.source) result.source = data.source;
  if (data.gated) result.gated = data.gated;
  if (data.career) result.careerScore = data.career.score;
  if (data.wealth) result.wealthScore = data.wealth.score;
  if (data.llmSummary) result.llmSummaryLen = data.llmSummary.length;
  if (data.baziBasis) result.baziBasis = data.baziBasis;
  if (data.message) result.message = String(data.message).slice(0, 100);
  result.preview = JSON.stringify(data).slice(0, 500);
  return result;
}

async function main() {
  console.log('='.repeat(80));
  console.log('P0-G1 v2 运行时接口实测 — A/C/D/D0 × 6 接口（B 缺时辰跳过）');
  console.log('='.repeat(80));

  // 1. 登录
  console.log('\n【Step 1】登录 4 个测试用户\n');
  const tokens = {};
  for (const [label, user] of Object.entries(USERS)) {
    const loginRes = await login(user.email, user.password);
    tokens[label] = loginRes.token;
    console.log(`  ${label} (${user.label}): HTTP ${loginRes.status}, token=${loginRes.token ? '✓' : '✗'}`);
    if (!loginRes.token) console.log(`    响应: ${JSON.stringify(loginRes.raw).slice(0, 300)}`);
  }

  // 2. 6 接口 × 4 用户
  console.log('\n【Step 2】6 接口 × 4 用户实测\n');
  const results = {};

  for (const ep of ENDPOINTS) {
    console.log(`\n  ---- ${ep.name} ----`);
    results[ep.name] = {};
    for (const [label, user] of Object.entries(USERS)) {
      if (!tokens[label]) {
        results[ep.name][label] = { status: 'NO_TOKEN', error: '登录失败' };
        console.log(`    ${label}: 跳过(无 token)`);
        continue;
      }
      try {
        const apiRes = await callApi(tokens[label], ep.path, ep.params);
        const mockSources = detectMockSource(apiRes.data, ep.name);
        const summary = summarizeData(apiRes.data, ep.name);
        results[ep.name][label] = { status: apiRes.status, mockSources, summary };
        console.log(`    ${label} (${user.label}): HTTP ${apiRes.status}, mock=${mockSources.join('|')}`);
        if (apiRes.status !== 200) {
          console.log(`      非 200: ${JSON.stringify(apiRes.data).slice(0, 300)}`);
        }
      } catch (err) {
        results[ep.name][label] = { status: 'ERR', error: err.message };
        console.log(`    ${label} (${user.label}): 异常 ${err.message}`);
      }
    }
  }

  // 3. 稳定性测试 - 用户 A 重复 3 次（每次先 seed 清空）
  console.log('\n【Step 3】稳定性测试 — 用户 A 重复 3 次\n');
  const meRes = await fetch(`${BASE}/auth/me`, { headers: { Authorization: `Bearer ${tokens.A}` } });
  const meData = await meRes.json().catch(() => ({}));
  const userIdA = meData.id || meData.userId;
  console.log(`  用户 A userId: ${userIdA}`);

  const stability = { bars: [], snapshots: [] };
  for (let i = 1; i <= 3; i++) {
    console.log(`  第 ${i} 次:`);
    // POST /kline-tide/seed 清空并重新生成
    const seedRes = await fetch(`${BASE}/kline-tide/seed?userId=${userIdA}&klineMonths=36&tideMonths=12`, { method: 'POST' });
    console.log(`    seed: HTTP ${seedRes.status}`);

    const barsRes = await callApi(tokens.A, '/kline-tide/bars', '?from=2024-01&to=2026-06');
    const barsData = Array.isArray(barsRes.data) ? barsRes.data : barsRes.data.klineBars || [];
    const barsSig = barsData.slice(0, 5).map(b => ({
      month: b.monthLabel, compositeCapital: b.compositeCapital, volatility: b.volatility, signalLabel: b.signalLabel,
    }));
    stability.bars.push({ run: i, status: barsRes.status, len: barsData.length, sig: barsSig });
    console.log(`    bars: HTTP ${barsRes.status}, len=${barsData.length}, 首5月=[${barsSig.map(s => s.compositeCapital).join(',')}]`);

    const snapRes = await callApi(tokens.A, '/kline-tide/snapshots', '?from=2024-01&to=2026-06');
    const snapData = Array.isArray(snapRes.data) ? snapRes.data : snapRes.data.stateSnapshots || [];
    const snapSig = snapData.slice(0, 3).map(s => {
      const dims = ['energy','recovery','emotion','clarity','liquidity','momentum','support','agency','order','growth','optionality','buffer'];
      const picked = {};
      dims.forEach(d => { if (s?.[d] !== undefined) picked[d] = s[d]; });
      return { month: s.monthLabel || s.month, picked };
    });
    stability.snapshots.push({ run: i, status: snapRes.status, len: snapData.length, sig: snapSig });
    console.log(`    snapshots: HTTP ${snapRes.status}, len=${snapData.length}, 首月=${JSON.stringify(snapSig[0]?.picked || {}).slice(0, 200)}`);
  }

  console.log('\n  ---- 稳定性对比 ----');
  const barsStable = stability.bars.every(r => r.status === 200) &&
    stability.bars[0].len > 0 &&
    JSON.stringify(stability.bars[0].sig) === JSON.stringify(stability.bars[1].sig) &&
    JSON.stringify(stability.bars[1].sig) === JSON.stringify(stability.bars[2].sig);
  console.log(`    bars 首5月一致: ${barsStable ? '是' : '否'}`);

  const snapStable = stability.snapshots.every(r => r.status === 200) &&
    stability.snapshots[0].len > 0 &&
    JSON.stringify(stability.snapshots[0].sig) === JSON.stringify(stability.snapshots[1].sig) &&
    JSON.stringify(stability.snapshots[1].sig) === JSON.stringify(stability.snapshots[2].sig);
  console.log(`    snapshots 首月12维一致: ${snapStable ? '是' : '否'}`);

  if (!barsStable) {
    console.log('    bars 差异:');
    for (let i = 0; i < 3; i++) console.log(`      Run${i+1}: ${JSON.stringify(stability.bars[i].sig[0] || {})}`);
  }
  if (!snapStable) {
    console.log('    snapshots 差异:');
    for (let i = 0; i < 3; i++) console.log(`      Run${i+1}: ${JSON.stringify(stability.snapshots[i].sig[0]?.picked || {})}`);
  }

  // 4. 保存结果
  const fullReport = {
    timestamp: new Date().toISOString(),
    users: Object.fromEntries(
      Object.entries(USERS).map(([k, v]) => [k, { email: v.email, label: v.label, hasToken: !!tokens[k] }])
    ),
    endpoints: ENDPOINTS,
    results,
    stability,
    verdict: {
      barsStable, snapStable,
      allEndpoints200: Object.values(results).every(ep => Object.values(ep).every(r => r.status === 200)),
      noError500: Object.values(results).every(ep => Object.values(ep).every(r => r.status !== 500 && r.status !== 'ERR')),
    },
  };

  require('fs').writeFileSync('scripts/_p0_g1_results_v2.json', JSON.stringify(fullReport, null, 2));
  console.log('\n【Step 4】完整结果已保存到 scripts/_p0_g1_results_v2.json');
  console.log('\n' + '='.repeat(80));
  console.log('P0-G1 v2 实测完成');
  console.log('='.repeat(80));
}

main().catch((e) => { console.error('实测脚本异常:', e); process.exitCode = 1; });
