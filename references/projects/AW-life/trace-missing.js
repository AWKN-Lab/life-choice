const Module = require('module');
const originalRequire = Module.prototype.require;
const missing = [];

Module.prototype.require = function(id) {
  try {
    return originalRequire.apply(this, arguments);
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') {
      missing.push({ id, error: e.message });
    }
    throw e;
  }
};

try {
  require('miniprogram-ci');
} catch (e) {
  console.log('Final error:', e.message);
}

console.log('\n=== Missing modules in load chain ===');
missing.forEach(m => console.log(m.id));
