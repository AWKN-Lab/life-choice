try {
  const ci = require('miniprogram-ci');
  console.log('miniprogram-ci loaded OK');
} catch(e) {
  console.error('Error:', e.message);
  console.error('Stack:', e.stack);
}