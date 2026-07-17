const http = require('http');

const postData = JSON.stringify({
  email: '10919669@qq.com',
  password: 'Lay780618'
});

const options = {
  hostname: 'localhost',
  port: 30001,
  path: '/api/v1/auth/login',
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
    console.log('状态码:', res.statusCode);
    console.log('响应:', body);
  });
});

req.on('error', (e) => console.error('错误:', e.message));
req.write(postData);
req.end();
