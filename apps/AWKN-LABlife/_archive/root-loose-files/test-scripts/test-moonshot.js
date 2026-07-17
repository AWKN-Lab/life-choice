const https = require('https');

const apiKey = process.env.MOONSHOT_API_KEY || 'sk-xxx';

const data = JSON.stringify({
  model: 'moonshot-v1-8k',
  messages: [
    { role: 'user', content: 'Say "Hello API works!" in Chinese' }
  ],
  temperature: 1
});

const options = {
  hostname: 'api.moonshot.cn',
  port: 443,
  path: '/v1/chat/completions',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', body.substring(0, 500));
  });
});

req.on('error', (e) => console.error('Error:', e.message));
req.write(data);
req.end();
