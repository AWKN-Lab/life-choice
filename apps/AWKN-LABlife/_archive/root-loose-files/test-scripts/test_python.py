#!/usr/bin/env python3
import http.client
import json

conn = http.client.HTTPConnection("127.0.0.1", 3000)
headers = {'Content-Type': 'application/json'}
body = json.dumps({"question": "test", "userId": "user123"})

try:
    conn.request("POST", "/api/v1/consult/route", body, headers)
    response = conn.getresponse()
    print(f"Status: {response.status}")
    print(f"Response: {response.read().decode()}")
except Exception as e:
    print(f"Error: {e}")
finally:
    conn.close()
