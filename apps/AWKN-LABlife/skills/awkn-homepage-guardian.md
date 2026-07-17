---
name: "awkn-homepage-guardian"
description: "AWKN 实验室主页守护技能 - 防止主页被覆盖的检查与恢复流程。当需要部署前端、恢复主页、验证主页时触发。包含备份位置、恢复命令、验证清单。"
trigger:
  - "主页被覆盖"
  - "恢复主页"
  - "主页部署"
  - "前端部署"
  - "验证主页"
  - "homepage"
  - "恢复备份"
---

# AWKN 主页守护技能

## 技能定位

防止主页被错误覆盖，确保部署后能正确验证。包含：
- 备份位置速查
- 恢复命令集
- 部署验证清单

---

## 核心信息

### 服务器路径（生产环境）

| 用途 | 路径 |
|------|------|
| **主站点主页** | /www/wwwroot/awkn-lab/index.html |
| **子站点（人生决策宗师）** | /www/wwwroot/awkn-lab/life/index.html |
| **备份来源** | /var/www/html/AWKN-LAB/dist/ |
| 后端工作目录 | /opt/awkn-life/ |
| 后端端口 | 3000 |

### 服务器连接

| 项目 | 值 |
|------|-----|
| 服务器 IP | 8.148.245.29 |
| SSH 用户 | root |
| SSH 端口 | 22 |
| SSH 密钥 | ~/.ssh/id_rsa_aliyun |

---

## 备份恢复流程

### Step 1: 确认备份存在

```bash
# SSH 连接后检查备份
ssh -p 22 -i ~/.ssh/id_rsa_aliyun root@8.148.245.29 "ls -la /var/www/html/AWKN-LAB/dist/"
```

### Step 2: 恢复主站点主页

```bash
# 方法1：直接从备份复制
ssh -p 22 -i ~/.ssh/id_rsa_aliyun root@8.148.245.29 "cp /var/www/html/AWKN-LAB/dist/index.html /www/wwwroot/awkn-lab/index.html"

# 方法2：如果备份不包含完整资源，从备份复制整个目录
ssh -p 22 -i ~/.ssh/id_rsa_aliyun root@8.148.245.29 "cp -r /var/www/html/AWKN-LAB/dist/* /www/wwwroot/awkn-lab/"
```

### Step 3: 验证主页

```bash
# 检查主页标题
curl -s https://awkn.linux88.com/ | grep -o '<title>.*</title>'

# 或检查子站点
curl -s https://awkn.linux88.com/life/ | grep -o '<title>.*</title>'
```

**期望结果**：
- 主站点：显示 "决策智能实验室" 或 "AWKN LAB"
- 子站点：显示 "人生决策宗师"

---

## 部署前/后验证清单

### 部署前检查

- [ ] 本地构建成功，无错误
- [ ] dist/index.html 标题正确
- [ ] 资源路径指向正确（不是 /life/assets/ 而是 /assets/）
- [ ] 打包文件完整

### 部署后验证（必须执行）

- [ ] **浏览器访问主站点，确认标题正确**
- [ ] **检查资源加载正常（无 404）**
- [ ] **验证子站点入口可访问**

### 快速验证命令

```bash
# 验证主页标题
curl -s https://awkn.linux88.com/ | grep -E '(决策智能实验室|AWKN LAB|定数实验室)'

# 验证子站点
curl -s https://awkn.linux88.com/life/ | grep -E '人生决策宗师'

# 检查 nginx 配置的根目录
# 主站点：/www/wwwroot/awkn-lab/
# 子站点：/www/wwwroot/awkn-lab/life/
```

---

## 关键教训

### 根因
1. 部署时没有验证主页是否正确
2. 备份位置未知，导致恢复时大海捞针
3. 资源路径配置错误（assets 指向 /life/assets/ 而非 /assets/）

### 经验
1. **备份位置**：/var/www/html/AWKN-LAB/dist/
2. **生产位置**：/www/wwwroot/awkn-lab/
3. **主站点入口**：awkn.linux88.com（不是 awkn.linux88.com/life/）
4. **部署后必须验证主页标题**

### 下次遇到主页问题，先做 3 件事

1. **检查备份位置**：/var/www/html/AWKN-LAB/dist/
2. **验证主页标题**：curl + grep 检查
3. **检查资源路径**：确保 assets 不指向 /life/

---

## 常见问题

### Q1: 主页显示"人生决策宗师"但应该是"决策智能实验室"

**原因**：部署时把子站点内容覆盖了主站点

**解决**：
```bash
# 从备份恢复主站点
ssh -p 22 -i ~/.ssh/id_rsa_aliyun root@8.148.245.29 "cp /var/www/html/AWKN-LAB/dist/index.html /www/wwwroot/awkn-lab/index.html"
```

### Q2: 资源加载 404

**原因**：JS/CSS 路径指向 /life/assets/ 而非 /assets/

**解决**：检查 index.html 中的资源路径，确保是相对路径或正确的前缀

### Q3: 找不到备份

**解决**：
```bash
# 列出可能的备份位置
ls -la /var/www/html/AWKN-LAB/
ls -la /var/www/html/
```

---

## 快速参考

```
【关键路径】
- 主站点：/www/wwwroot/awkn-lab/（标题应为"决策智能实验室"）
- 子站点：/www/wwwroot/awkn-lab/life/（标题应为"人生决策宗师"）
- 备份：/var/www/html/AWKN-LAB/dist/

【验证命令】
curl -s https://awkn.linux88.com/ | grep '<title>'

【恢复命令】
ssh root@8.148.245.29 "cp /var/www/html/AWKN-LAB/dist/index.html /www/wwwroot/awkn-lab/index.html"
```

---

## 版本

- v1.0：初始版本
- 生成时间：2026-04-10