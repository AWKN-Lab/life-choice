
# 修复前端资源 404 问题 - 计划文档

## 问题描述
生产环境 `https://awkn.cn/life/` 出现多个 JS 文件 404 错误：
- `life/assets/HomePage-DzCgGZJl.js`
- `life/assets/languageStore-BYk8z6Jp.js`
- `life/assets/userProfileStore-C7xWjebQ.js`
- `life/assets/consult-DRX1Fotx.js`
- `life/assets/FrontdeskChat-ClPnXDuk.js`

## 根因分析
1. **本地代码修改后**：Vite 重新构建，chunk 文件名哈希发生变化
2. **服务器上是旧版本**：`/usr/share/nginx/html/` 目录下还是旧的构建产物
3. **动态导入失败**：旧的 `index-DY6sjEZJ.js` 尝试加载新哈希的 chunk 文件，导致 404

## 修复方案
### 方案概述
重新构建前端 → 上传到服务器 → 替换 Nginx 静态目录

---

## 具体步骤

### 步骤 1: 本地构建前端
- **目录**: `C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\AWKN-LABlife\app`
- **操作**:
  1. 安装依赖（如果需要）
  2. 设置环境变量 `VITE_API_BASE_URL=https://awkn.cn/api`
  3. 运行 `npm run build`
- **产物**: `app/dist/` 目录

### 步骤 2: 打包并上传
- **打包**: 压缩 `dist/` 目录
- **上传**: 用 `scp` 传到服务器 `/opt/awkn-life/`

### 步骤 3: 服务器上部署
- **连接**: SSH 到 `8.148.245.29`
- **备份**: 备份当前 `/usr/share/nginx/html/`（可选）
- **解压**: 解压新构建到 Nginx 目录
- **验证**: 检查文件是否正确
- **重载**: 重载 Nginx（可选）

---

## 涉及的文件和目录
| 路径 | 类型 | 说明 |
|------|------|------|
| `AWKN-LABlife/app/` | 目录 | 前端项目根目录 |
| `AWKN-LABlife/app/dist/` | 目录 | 构建产物 |
| `/usr/share/nginx/html/` | 目录（服务器） | Nginx 静态文件目录 |

---

## 潜在风险和应对
| 风险 | 概率 | 影响 | 应对措施 |
|------|------|------|----------|
| 上传过程中断 | 中 | 服务器上是不完整的文件 | 先备份旧版本，解压完成后再验证 |
| 构建失败 | 低 | 无法生成新产物 | 检查本地依赖和环境变量 |
| Nginx 配置错误 | 低 | 服务不可用 | 修改前备份配置，用 `nginx -t` 验证 |

---

## 验收标准
1. 访问 `https://awkn.cn/life/` 页面正常加载
2. 浏览器控制台没有 404 错误
3. 登录功能正常（之前修复的 401 问题已解决）
4. 所有页面路由和功能正常工作
