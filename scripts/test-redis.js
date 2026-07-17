const Redis = require("ioredis");
const r = new Redis();
r.ping().then(x => { console.log("Redis OK:", x); r.quit(); }).catch(e => { console.log("Redis FAIL:", e.message); r.quit(); });
