// 直接查询 API 返回
const base = 'https://awkn.cn/api/v1';
const recordId = process.argv[2];

if (!recordId) {
  console.log('Usage: node query-api.cjs <recordId>');
  process.exit(1);
}

const email = `query_${Date.now()}@awkn.cn`;
async function main() {
  const regRes = await fetch(base + '/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: process.env.TEST_PASSWORD || 'test123456', nickname: 'query' }),
  });
  const regJson = await regRes.json();
  const reg = regJson.data || regJson;
  const token = reg.accessToken || reg.token;

  const pollRes = await fetch(base + '/consult/result/' + recordId, {
    headers: { 'Authorization': 'Bearer ' + token },
  });
  const pollJson = await pollRes.json();
  // 打印顶层 key 和 llmResult 详情
  console.log('=== TOP KEYS ===');
  console.log(Object.keys(pollJson));
  console.log('=== top-level fields search ===');
  console.log('record_id:', pollJson.record_id);
  console.log('zhangbanshan_output:', !!pollJson.zhangbanshan_output);
  console.log('fiveLayers:', !!pollJson.fiveLayers);
  console.log('llmResult exists:', !!pollJson.llmResult);
  if (pollJson.llmResult) {
    if (typeof pollJson.llmResult === 'string') {
      console.log('llmResult is string, first 500 chars:');
      console.log(pollJson.llmResult.slice(0, 500));
    } else {
      console.log('llmResult keys:', Object.keys(pollJson.llmResult));
      console.log('llmResult.fiveLayers exists:', !!pollJson.llmResult.fiveLayers);
      console.log('llmResult.zhangbanshan_output exists:', !!pollJson.llmResult.zhangbanshan_output);
    }
  }
}

main().catch(e => { console.error('ERR:', e.message); process.exit(1); });
