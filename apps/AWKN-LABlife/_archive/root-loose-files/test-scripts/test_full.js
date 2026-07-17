const http = require("http");

function makeRequest(path, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const req = http.request({
      hostname: "localhost",
      port: 3000,
      path: path,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body)
      }
    }, (res) => {
      let responseBody = "";
      res.on("data", (d) => responseBody += d);
      res.on("end", () => {
        console.log(`Response for ${path}:`, responseBody);
        try {
          resolve(JSON.parse(responseBody));
        } catch {
          resolve(responseBody);
        }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function test() {
  console.log("Step 1: Create consult session...");
  const routeResult = await makeRequest("/api/v1/consult/route", {
    question: "test career",
    userId: "user123"
  });
  console.log("Route result:", routeResult);

  if (routeResult.record_id) {
    console.log("\nStep 2: Submit info...");
    const infoResult = await makeRequest("/api/v1/consult/info", {
      sessionId: routeResult.record_id,
      routeType: "ziping",
      question: "test career",
      birthDate: "1995-06-15",
      birthTime: "12:30",
      birthPlace: "Beijing",
      gender: "male"
    });
    console.log("Info result:", infoResult);
  }
}

test().catch(console.error);
