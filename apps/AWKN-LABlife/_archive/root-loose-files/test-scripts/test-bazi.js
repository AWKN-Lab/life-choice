const http = require('http');

function postRequest(path, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const options = {
      hostname: 'localhost',
      port: 30001,
      path: '/api/v1' + path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function test() {
  console.log('=== 测试咨询流程 ===\n');

  // 1. 测试路由
  console.log('1. 测试 /consult/route...');
  const route = await postRequest('/consult/route', {
    question: '工作运势如何'
  });
  console.log('状态:', route.status);
  console.log('结果:', JSON.stringify(route.data, null, 2));

  if (route.data.sessionId) {
    // 2. 测试提交信息
    console.log('\n2. 测试 /consult/info...');
    const info = await postRequest('/consult/info', {
      sessionId: route.data.sessionId,
      routeType: route.data.route_type,
      question: '工作运势如何',
      birthDate: '1995-06-15',
      birthTime: '12:00',
      birthPlace: '北京',
      gender: 'male'
    });
    console.log('状态:', info.status);
    console.log('结果:', JSON.stringify(info.data, null, 2).substring(0, 1000));

    if (info.data.record_id) {
      // 3. 测试获取结果
      console.log('\n3. 测试 /consult/result...');
      const result = await postRequest('/consult/result', {
        record_id: info.data.record_id
      });
      console.log('状态:', result.status);
      console.log('结果:', JSON.stringify(result.data, null, 2).substring(0, 2000));
    }
  }
}

test().catch(console.error);
