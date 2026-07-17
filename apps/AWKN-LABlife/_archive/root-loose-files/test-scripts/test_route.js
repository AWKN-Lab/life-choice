const http = require("http");
const data = JSON.stringify({
  question: "test",
  userId: "user123"
});

const req = http.request({
  hostname: "localhost",
  port: 3000,
  path: "/api/v1/consult/route",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(data)
  }
}, (res) => {
  let body = "";
  res.on("data", (d) => body += d);
  res.on("end", () => console.log(body));
});

req.write(data);
req.end();
