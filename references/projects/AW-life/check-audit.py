#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import requests, json

APPID = 'wx14a9a3210a24f504'
APPSECRET = 'b46fdc510711c6d77525f694fb436c03'

r = requests.get('https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=%s&secret=%s' % (APPID, APPSECRET))
token = r.json().get('access_token', '')
if not token:
    print('Token failed:', r.json())
    exit(1)

print('Token OK')

# 查询审核状态
r2 = requests.get('https://api.weixin.qq.com/wxa/get_latest_auditstatus?access_token=%s' % token)
print('Audit status:')
print(json.dumps(r2.json(), ensure_ascii=False, indent=2))

# 查询版本列表
r3 = requests.get('https://api.weixin.qq.com/wxa/getversionlist?access_token=%s' % token)
print('\nVersion list:')
print(json.dumps(r3.json(), ensure_ascii=False, indent=2))
