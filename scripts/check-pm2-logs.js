const { execSync } = require("child_process");
const out = execSync("pm2 logs awkn-life-backend --err --lines 60 --nostream 2>&1", { encoding: "utf-8" });
console.log(out);
