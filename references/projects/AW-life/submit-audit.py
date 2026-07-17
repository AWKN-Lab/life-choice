#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
小程序自动提交审核脚本 v3
修正：item_list 需要包含 first_class/second_class 字段
"""
import json
import requests

APPID = 'wx14a9a3210a24f504'
APPSECRET = 'b46fdc510711c6d77525f694fb436c03'

def get_access_token():
    url = f'https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid={APPID}&secret={APPSECRET}'
    resp = requests.get(url)
    data = resp.json()
    if 'access_token' in data:
        print(f'[OK] 获取 access_token 成功')
        return data['access_token']
    else:
        raise Exception(f'获取token失败: {data}')

def get_category(token):
    """获取可用类目列表"""
    url = f'https://api.weixin.qq.com/wxa/get_category?access_token={token}'
    resp = requests.get(url)
    data = resp.json()
    
    if 'category_list' in data:
        print(f'\n[INFO] 可用类目:')
        result = []
        for i, cat in enumerate(data['category_list']):
            first = cat.get('first_class', '')
            second = cat.get('second_class', '')
            fid = cat.get('first_id', '')
            sid = cat.get('second_id', '')
            print(f"  {i+1}. [{first} > {second}] id={fid}/{sid}")
            result.append(cat)
        return result
    return []

def submit_audit(token):
    categories = get_category(token)
    if not categories:
        return None
    
    # 用第一个可用类目
    cat = categories[0]
    
    submit_url = f'https://api.weixin.qq.com/wxa/submit_audit?access_token={token}'
    
    payload = {
        "item_list": [
            {
                "address": "pages/home/index",
                "tag": "",
                "first_class": cat['first_class'],
                "second_class": cat['second_class'],
                "first_id": cat['first_id'],
                "second_id": cat['second_id'],
                "title": "首页"
            },
            {
                "address": "pages/result/index",
                "tag": "",
                "first_class": cat['first_class'],
                "second_class": cat['second_class'],
                "first_id": cat['first_id'],
                "second_id": cat['second_id'],
                "title": "结果页"
            }
        ],
        "version_desc": "人生决策宗师 v1.0 首版上线"
    }
    
    print(f'[INFO] 提交审核...')
    print(f'[DEBUG] 类目: {cat["first_class"]} > {cat["second_class"]}')
    
    resp = requests.post(submit_url, json=payload)
    result = resp.json()
    
    if 'auditid' in result:
        print(f'\n✅ 审核提交成功! auditid: {result["auditid"]}')
        return result['auditid']
    else:
        print(f'\n❌ 失败:')
        print(json.dumps(result, ensure_ascii=False, indent=2))
        
        # 用 rid 查详情
        rid = result.get('errmsg', '').split('rid: ')[-1].split(' ')[0] if 'rid:' in result.get('errmsg', '') else ''
        if rid:
            print(f'\n[INFO] 查询错误详情 (rid={rid})...')
            try:
                rid_url = f'https://api.weixin.qq.com/cgi-bin/openapi/rid/get'
                rid_resp = requests.post(rid_url, json={"access_token": token, "rid": rid})
                print(json.dumps(rid_resp.json(), ensure_ascii=False, indent=2))
            except:
                pass
        return None

def main():
    print('=' * 50)
    print('小程序自动提交审核 v3')
    print('=' * 50)
    
    token = get_access_token()
    auditid = submit_audit(token)
    
    if auditid:
        print(f'\n{"=" * 50}')
        print(f'🎉 审核已提交! ID: {auditid}')
        print(f'   去 mp.weixin.qq.com → 版本管理 查看进度')
        print(f'{"=" * 50}')

if __name__ == '__main__':
    main()
