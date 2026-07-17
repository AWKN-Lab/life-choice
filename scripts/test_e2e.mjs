// 端到端LLM调用测试 v2
const base = 'https://awkn.cn/api/v1';

async function run() {
  console.log('=== 步骤1: 注册测试用户 ===');
  const email = `test_${Date.now()}@awkn.cn`;
  const regRes = await fetch(base + '/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: process.env.TEST_PASSWORD || 'test123456', nickname: '测试用户' }),
  });
  console.log('REG status:', regRes.status);
  const regJson = await regRes.json();
  const reg = regJson.data || regJson;
  console.log('REG body:', JSON.stringify(regJson).slice(0, 500));

  let token = reg.accessToken || reg.token;
  if (!token) {
    console.log('\n=== 步骤1b: 尝试登录 ===');
    const loginRes = await fetch(base + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: process.env.TEST_PASSWORD || 'test123456' }),
    });
    const loginJson = await loginRes.json();
    const login = loginJson.data || loginJson;
    token = login.accessToken || login.token;
  }

  if (!token) {
    console.log('❌ 无法获取token');
    return;
  }
  console.log('✅ Token obtained:', token.slice(0, 30) + '...');

  console.log('\n=== 步骤2: 发起咨询 ===');
  const consultRes = await fetch(base + '/consult/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({
      question: '我最近在考虑要不要换工作，现在的工作稳定但没成长空间，新机会薪资高50%但行业不熟悉',
      routeType: 'ziwei',
      birthDate: '1990-05-15',
      birthTime: '14:30',
      birthPlace: '北京',
      gender: 'male',
    }),
  });
  console.log('CONSULT status:', consultRes.status);
  const consultJson = await consultRes.json();
  console.log('CONSULT response:', JSON.stringify(consultJson).slice(0, 500));
  const consult = consultJson.data || consultJson;
  const recordId = consult.id || consult.recordId || consult.record_id || consultJson.data?.record_id;

  if (!recordId) {
    console.log('❌ 咨询接口异常，结束测试');
    return;
  }
  console.log('✅ recordId:', recordId);

  console.log('\n=== 步骤3: 轮询查询结果 (recordId=' + recordId + ') ===');
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 6000));
    const pollRes = await fetch(base + '/consult/result/' + recordId, {
      headers: { 'Authorization': 'Bearer ' + token },
    });
    const pollJson = await pollRes.json();
    const record = pollJson.data || pollJson;
    const hasFL = !!record?.fiveLayers;
    const hasJ = !!record?.zhangbanshan_output?.judgment;
    console.log(`[${i+1}/20] status=${record?.status} | fiveLayers=${hasFL} | judgment=${hasJ}`);
    if (record?.status === 'completed' || record?.status === 'failed') {
      console.log('\n=== 最终结果 ===');
      console.log('status:', record.status);
      if (record.fiveLayers) {
        console.log('5层 keys:', Object.keys(record.fiveLayers));
        console.log('事实层:', (record.fiveLayers.factLayer || '').slice(0, 200));
        console.log('解读层:', (record.fiveLayers.interpretationLayer || '').slice(0, 200));
        console.log('推演层:', (record.fiveLayers.deductionLayer || '').slice(0, 200));
        console.log('建议层:', (record.fiveLayers.adviceLayer || '').slice(0, 200));
        console.log('点睛层:', (record.fiveLayers.insightLayer || '').slice(0, 200));
        console.log('---');
        console.log('张半山判断:', (record.zhangbanshan_output?.judgment || '').slice(0, 200));
      }
      if (record.status === 'failed') {
        console.log('error:', record.errorMessage);
      }
      break;
    }
  }
}

run().catch((e) => { console.error('ERR:', e.message, e.stack); process.exit(1); });
