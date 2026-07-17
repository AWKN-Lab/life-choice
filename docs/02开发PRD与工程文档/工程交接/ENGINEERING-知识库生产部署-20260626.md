# 工程交接文档：知识库生产部署（P3 部署链路打通）

> **版本**：v1.0
> **日期**：2026-06-26
> **状态**：待审查
> **上游 PRD**：PRD-KG-001
> **下游消费者**：awkn-工程师（Build）、awkn-审核（Review）、awkn-部署（Ship）

---

## 1. 变更摘要

P0–P2 已完成知识库建设（585 部书 / 137337 条向量 / 536MB），但生产环境（阿里云 ECS）未启动 knowledge-service，知识库在生产不可用。P3 需打通部署链路，让向量检索在阿里云 ECS 上以 PM2 + Nginx 方式运行，NestJS 后端可调用 hybrid_search。

**核心改动**：
- 服务器环境探测与 Python 依赖安装（fastapi / uvicorn / numpy）
- 上传 knowledge-service 代码与知识库产物（embeddings.npy 536MB 走 SCP/rsync 直传，不进 Git）
- 路径适配：确保 `_PROJECT_ROOT` 在服务器正确推算到 `/opt/awkn-life`
- PM2 配置新增 `knowledge-service` 进程（与 `awkn-life-backend` 并列）
- IDF 预计算缓存（冷启动从 37 秒降到 < 3 秒）
- 端到端验证（公网健康检查 + 本地 8701 + hybrid_search 回退链路）

**部署策略**：阿里云 ECS（8.148.245.29）+ PM2 + Nginx（**无 Docker**，推翻 Docker 方案）

**改动规模**：2 个文件修改（ecosystem.config.js / embed_classics.py + main.py），1 个数据上传（536MB），7 个工程步骤

---

## 2. 技术约束

| 约束项 | 实际值 |
|--------|--------|
| 服务器 | 阿里云 ECS 8.148.245.29 |
| 部署方式 | PM2 + Nginx（**无 Docker**） |
| 服务器 Python | Python3（排盘引擎在用，需 ≥ 3.8） |
| 后端框架 | NestJS（端口 30000） |
| 知识服务框架 | FastAPI + uvicorn（纯 numpy 内存向量检索） |
| knowledge-service 端口 | 8701，**仅监听 127.0.0.1** |
| 向量数据 | embeddings.npy（536.5MB，shape=(137337, 1024)） |
| 索引数据 | classics_index.jsonl（137337 条） |
| 向量库模式 | numpy_in_memory（绕过 ChromaDB 兼容性问题） |
| 服务器项目根 | `/opt/awkn-life` |
| embeddings.npy 传输 | SCP/rsync 直传，**不进 Git** |
| 主项目根（本地） | `c:\Users\10919\Desktop\AWKN-Lab\人生决策宗师` |

### 宪法约束（constitution.md）

- "Knowledge Service 只监听 127.0.0.1:8701"（强约束，不对外暴露）
- 部署策略：阿里云 ECS（8.148.245.29）+ PM2 + Nginx

### 关键依赖文件

| 文件 | 路径 |
|------|------|
| knowledge-service 主文件 | [main.py](file:///c:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/apps/AWKN-LABlife/services/knowledge-service/main.py) |
| ecosystem 配置 | [ecosystem.config.js](file:///c:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/apps/AWKN-LABlife/awkn-life-backend/ecosystem.config.js) |
| Python 依赖 | [requirements.txt](file:///c:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/apps/AWKN-LABlife/services/knowledge-service/requirements.txt) |
| Embedding 脚本 | [embed_classics.py](file:///c:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/scripts/embed_classics.py) |
| 向量产物 | [embeddings.npy](file:///c:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/knowledge/processed/embeddings.npy) |
| 索引产物 | [classics_index.jsonl](file:///c:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/knowledge/processed/classics_index.jsonl) |
| 清单文件 | [_manifest.json](file:///c:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/knowledge/processed/_manifest.json) |
| NestJS 调用方 | [knowledge-retriever.service.ts](file:///c:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/orchestrator/knowledge-retriever.service.ts) |

---

## 3. 技术方案

### 3.0 代码事实核对（已验证）

#### main.py 路径推算逻辑

[main.py](file:///c:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/apps/AWKN-LABlife/services/knowledge-service/main.py) 第 106–118 行：

```python
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_APPS_LIFE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(_THIS_DIR)))  # 注释写 apps/AWKN-LABlife
_PROJECT_ROOT = os.path.dirname(_APPS_LIFE_DIR)  # 项目根

EMBED_FILE = os.path.join(_PROJECT_ROOT, 'knowledge', 'processed', 'embeddings.npy')
INDEX_FILE = os.path.join(_PROJECT_ROOT, 'knowledge', 'processed', 'classics_index.jsonl')
```

**本地推算**（main.py 位于 `项目根/apps/AWKN-LABlife/services/knowledge-service/main.py`）：
- `_THIS_DIR` = `项目根/apps/AWKN-LABlife/services/knowledge-service`
- 3 级 dirname = `项目根/apps`
- `_PROJECT_ROOT` = `项目根` ✓ 正确

**⚠️ 服务器路径关键约束**：`_PROJECT_ROOT` 推算依赖 main.py 所在路径与项目根之间的层级深度（本地为 4 级）。若服务器采用扁平化路径 `/opt/awkn-life/services/knowledge-service/`（仅 2 级），3 级 dirname 会推算到 `/opt`，`_PROJECT_ROOT` 推算到 `/`，**导致 EMBED_FILE/INDEX_FILE 路径错误**。

因此 P3.3 上传与 P3.4 路径适配有两条可行路径（见 P3.4），**推荐方案 A（保持完整镜像层级）**，零代码改动。

#### main.py 其他事实
- 监听 `127.0.0.1:8701`（第 318 行 `uvicorn.run(app, host="127.0.0.1", port=8701)`）
- `_init_chroma()`（第 128–170 行）：加载 embeddings.npy + classics_index.jsonl，拟合 TF-IDF，冷启动约 37 秒（137337 条语料）
- `/health-v2` 端点（第 206 行）：返回 `v2_initialized`、`vector_count`、`vector_mode: numpy_in_memory`
- `/hybrid_search` 端点（第 260 行）：向量 Top-K ∪ 关键词 Top-K，重排去重

#### ecosystem.config.js 现状
[ecosystem.config.js](file:///c:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/apps/AWKN-LABlife/awkn-life-backend/ecosystem.config.js) 现有 1 个进程 `awkn-life-backend`：
- `cwd: "/opt/awkn-life/awkn-life-backend"`
- `script: "scripts/bootstrap-production.js"`
- `exec_mode: "fork"`, `instances: 1`
- 环境变量由 `.env` 统一管理（PM2 仅保留 `NODE_ENV`）

由 `cwd` 可知服务器把本地 `apps/AWKN-LABlife/` 映射为 `/opt/awkn-life/`（扁平化）。**knowledge-service 同样会被扁平化**，需在 P3.3/P3.4 处理路径层级问题。

#### requirements.txt
[requirements.txt](file:///c:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/apps/AWKN-LABlife/services/knowledge-service/requirements.txt)：
- fastapi==0.115.0
- uvicorn[standard]==0.30.0
- numpy==1.26.4
- （sentence-transformers / chromadb 在 v2 已绕过，生产可只装 fastapi/uvicorn/numpy）

#### embed_classics.py 现状
[embed_classics.py](file:///c:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/scripts/embed_classics.py) 的 `TfidfCharBigramEmbedder`：
- `fit(texts)`（第 69 行）：计算 `self.idf`（numpy 数组），耗时约 37 秒
- `encode_one(text)`（第 86 行）：单条编码
- **当前无 `save_idf` / `load_idf` 方法**，P3.6 需新增

---

### P3.1 服务器环境探测

- **动作**：SSH 到阿里云 ECS，检查 Python3 版本（≥3.8）、pip、可用内存（≥1GB）、磁盘剩余（≥2GB）
- **命令**：`python3 --version && pip3 --version && free -h && df -h /opt`
- **产出**：服务器环境基线数据
- **验收标准**：Python3 ≥ 3.8；可用内存 ≥ 1GB；`/opt` 剩余 ≥ 2GB
- **验证方法（10 分钟内）**：SSH 执行上述命令，记录输出
- **回滚方式**：无（只读探测）
- **风险标记**：低

### P3.2 安装 Python 依赖

- **动作**：服务器执行 `pip3 install fastapi uvicorn numpy`
- **产出**：knowledge-service 运行所需 Python 包
- **验收标准**：`python3 -c "import fastapi, uvicorn, numpy; print('OK')"` 输出 OK
- **验证方法**：SSH 执行导入命令
- **回滚方式**：`pip3 uninstall fastapi uvicorn numpy`
- **风险标记**：低
- **注意**：若服务器 numpy 已被排盘引擎占用，安装 1.26.4 可能冲突；如冲突则保留现有 numpy（只要 ≥ 1.20 即可满足 `_np.float_` 兼容补丁）

### P3.3 上传代码与数据

- **动作**：SCP/rsync 上传两个目录到服务器
- **方案 A（推荐，保持完整镜像层级，零代码改动）**：
  1. `services/knowledge-service/` → `/opt/awkn-life/apps/AWKN-LABlife/services/knowledge-service/`
  2. `knowledge/processed/` → `/opt/awkn-life/knowledge/processed/`（含 536MB embeddings.npy）
  - 此方案下 `_THIS_DIR` = `/opt/awkn-life/apps/AWKN-LABlife/services/knowledge-service`，3 级 dirname = `/opt/awkn-life/apps`，`_PROJECT_ROOT` = `/opt/awkn-life` ✓
- **方案 B（扁平化路径，需配合 P3.4 代码改动）**：
  1. `services/knowledge-service/` → `/opt/awkn-life/services/knowledge-service/`
  2. `knowledge/processed/` → `/opt/awkn-life/knowledge/processed/`
  - 此方案下 `_PROJECT_ROOT` 会推算到 `/`，需在 P3.4 给 main.py 增加 `KNOWLEDGE_DATA_DIR` 环境变量覆盖
- **上传命令（方案 A，rsync 断点续传）**：
  ```bash
  rsync -avz --progress apps/AWKN-LABlife/services/knowledge-service/ root@8.148.245.29:/opt/awkn-life/apps/AWKN-LABlife/services/knowledge-service/
  rsync -avz --progress knowledge/processed/ root@8.148.245.29:/opt/awkn-life/knowledge/processed/
  ```
- **产出**：服务器具备完整代码与知识库产物
- **验收标准**：SSH `ls -la` 确认 `embeddings.npy` 存在且大小约 536MB；`classics_index.jsonl` 存在；`main.py` 存在
- **验证方法**：`ssh root@8.148.245.29 "ls -la /opt/awkn-life/knowledge/processed/embeddings.npy && stat -c %s /opt/awkn-life/knowledge/processed/embeddings.npy"`
- **回滚方式**：`ssh root@8.148.245.29 "rm -rf /opt/awkn-life/apps/AWKN-LABlife/services/knowledge-service /opt/awkn-life/knowledge/processed"`
- **风险标记**：高
- **Plan B**：536MB 上传慢或中断 → 用 rsync `--partial --append-verify` 断点续传；网络极差时考虑分片压缩

### P3.4 路径适配验证

- **动作**：服务器执行 `_init_chroma()` 验证路径推算正确
- **前置**：P3.3 已采用方案 A（完整镜像层级）
- **命令**：
  ```bash
  cd /opt/awkn-life/apps/AWKN-LABlife/services/knowledge-service
  python3 -c "import main; print('_PROJECT_ROOT=', main._PROJECT_ROOT); print('EMBED_FILE=', main.EMBED_FILE); ok=main._init_chroma(); print('init_ok=', ok)"
  ```
- **产出**：确认 `_PROJECT_ROOT=/opt/awkn-life`，`_init_chroma()` 返回 True
- **验收标准**：`_PROJECT_ROOT` = `/opt/awkn-life`；`EMBED_FILE` = `/opt/awkn-life/knowledge/processed/embeddings.npy`；`_init_chroma()` 返回 True，无路径错误
- **验证方法**：SSH 执行上述命令，检查输出
- **回滚方式**：
  - 若采用方案 B（扁平化路径）导致路径错误：给 main.py 增加 `KNOWLEDGE_DATA_DIR` 环境变量覆盖 `EMBED_FILE`/`INDEX_FILE`，并在 PM2 env 中注入
  - 代码改动示意：
    ```python
    _DATA_DIR = os.getenv("KNOWLEDGE_DATA_DIR", os.path.join(_PROJECT_ROOT, 'knowledge', 'processed'))
    EMBED_FILE = os.path.join(_DATA_DIR, 'embeddings.npy')
    INDEX_FILE = os.path.join(_DATA_DIR, 'classics_index.jsonl')
    ```
- **风险标记**：中
- **注意**：此步骤是整个 P3 的关键卡点，路径不对则后续全部失败

### P3.5 PM2 配置新增

- **动作**：修改 [ecosystem.config.js](file:///c:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/apps/AWKN-LABlife/awkn-life-backend/ecosystem.config.js)，在 `apps` 数组新增 `knowledge-service` 进程
- **新增配置（方案 A 路径）**：
  ```javascript
  {
    name: "knowledge-service",
    script: "main.py",
    cwd: "/opt/awkn-life/apps/AWKN-LABlife/services/knowledge-service",
    interpreter: "python3",
    instances: 1,
    exec_mode: "fork",
    env: {
      PYTHONUNBUFFERED: "1",
    },
    watch: false,
    max_memory_restart: "1G",
  },
  ```
- **产出**：PM2 同时管理 `awkn-life-backend` + `knowledge-service` 两个进程
- **验收标准**：服务器 `pm2 list` 显示 2 个进程均 online
- **验证方法**：
  ```bash
  pm2 start ecosystem.config.js
  pm2 list
  pm2 logs knowledge-service --lines 30
  ```
- **回滚方式**：`pm2 delete knowledge-service && git checkout apps/AWKN-LABlife/awkn-life-backend/ecosystem.config.js`
- **风险标记**：中
- **Plan B**：若 PM2 管理 Python 进程有兼容问题，改用 `script: "python3"` + `args: "main.py"`，或直接 `python3 -m uvicorn main:app --host 127.0.0.1 --port 8701` 用 systemd 托管

### P3.6 IDF 预计算缓存

- **动作**：修改 [embed_classics.py](file:///c:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/scripts/embed_classics.py) 与 [main.py](file:///c:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/apps/AWKN-LABlife/services/knowledge-service/main.py)，新增 IDF 缓存机制
- **改动 1：TfidfCharBigramEmbedder 新增方法**（embed_classics.py）：
  ```python
  def save_idf(self, path: str):
      """保存 IDF 向量到 .pkl"""
      import pickle
      with open(path, "wb") as f:
          pickle.dump({"idf": self.idf, "dim": self.dim}, f)

  def load_idf(self, path: str) -> bool:
      """从 .pkl 加载 IDF，成功返回 True"""
      import pickle
      try:
          with open(path, "rb") as f:
              data = pickle.load(f)
          if data["dim"] == self.dim and data["idf"].shape[0] == self.dim:
              self.idf = data["idf"]
              self.fitted = True
              return True
      except Exception:
          pass
      return False
  ```
- **改动 2：_init_chroma() 优先加载缓存**（main.py 第 162–165 行附近）：
  ```python
  _tfidf_embedder = TfidfCharBigramEmbedder(dim=_loaded_embeddings.shape[1])
  _IDF_CACHE = os.path.join(os.path.dirname(EMBED_FILE), "idf_cache.pkl")
  if _tfidf_embedder.load_idf(_IDF_CACHE):
      print(f"[v2] IDF 缓存命中: {_IDF_CACHE}")
  else:
      print(f"[v2] 拟合 TF-IDF embedder 并保存缓存...")
      _tfidf_embedder.fit([it['text'] for it in _loaded_items])
      try:
          _tfidf_embedder.save_idf(_IDF_CACHE)
      except Exception as e:
          print(f"[v2] IDF 缓存保存失败（不影响运行）: {e}")
  ```
- **缓存位置**：`/opt/awkn-life/knowledge/processed/idf_cache.pkl`
- **产出**：首次启动生成 idf_cache.pkl；二次启动跳过 37 秒拟合，冷启动 < 3 秒
- **验收标准**：
  - 首次启动：`idf_cache.pkl` 生成，`/health-v2` 返回 `v2_initialized: True`
  - 二次启动：日志出现 `IDF 缓存命中`，`time curl http://127.0.0.1:8701/health-v2` < 3 秒
- **验证方法**：
  ```bash
  # 首次
  pm2 restart knowledge-service && pm2 logs knowledge-service --lines 20
  ls -la /opt/awkn-life/knowledge/processed/idf_cache.pkl
  # 二次
  pm2 restart knowledge-service
  time curl http://127.0.0.1:8701/health-v2
  ```
- **回滚方式**：`rm /opt/awkn-life/knowledge/processed/idf_cache.pkl`，回退到实时拟合（37 秒）；或 `git checkout` embed_classics.py 与 main.py
- **风险标记**：低
- **Plan B**：pkl 加载失败自动回退实时拟合（代码已 try/except 兜底）

### P3.7 端到端验证

- **动作**：全链路验证知识服务在生产可用
- **验证项**：
  1. 公网：`curl https://awkn.cn/life/api/v1/health` 返回 200
  2. 服务器本地：`curl http://127.0.0.1:8701/health-v2` 返回 `v2_initialized: True`, `vector_count: 137337`
  3. NestJS 后端日志：`hybrid_search` 调用成功（[knowledge-retriever.service.ts](file:///c:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/orchestrator/knowledge-retriever.service.ts) 已支持回退）
  4. 冷启动：`time curl` 两次对比，第二次 < 3 秒
- **产出**：P3 部署链路打通，知识库在生产可用
- **验收标准**：上述 4 项全部通过
- **验证方法**：依次执行 curl 命令 + 查后端日志
- **回滚方式**：设置 `USE_HYBRID_SEARCH=false` 回退关键词检索（NestJS 后端已支持回退）
- **风险标记**：中

---

## 4. 验收用例

| ID | 用例 | 前置条件 | 操作 | 预期结果 |
|----|------|----------|------|----------|
| P3.1-01 | 服务器 Python 版本 | SSH 可达 | `ssh root@8.148.245.29 "python3 --version"` | ≥ 3.8 |
| P3.2-01 | Python 依赖可导入 | P3.1 通过 | `ssh root@8.148.245.29 "python3 -c \"import fastapi,uvicorn,numpy; print('OK')\""` | 输出 OK |
| P3.3-01 | embeddings.npy 上传完成 | P3.2 通过 | `ssh root@8.148.245.29 "ls -la /opt/awkn-life/knowledge/processed/embeddings.npy"` | 文件存在，大小约 536MB |
| P3.3-02 | classics_index.jsonl 上传完成 | P3.3-01 通过 | `ssh root@8.148.245.29 "wc -l /opt/awkn-life/knowledge/processed/classics_index.jsonl"` | 137337 行 |
| P3.4-01 | 路径推算正确 | P3.3 通过 | `ssh root@8.148.245.29 "cd /opt/awkn-life/apps/AWKN-LABlife/services/knowledge-service && python3 -c \"import main; print(main._PROJECT_ROOT); print(main._init_chroma())\""` | `_PROJECT_ROOT=/opt/awkn-life`，`_init_chroma()` 返回 True |
| P3.5-01 | PM2 进程 online | P3.4 通过 | `ssh root@8.148.245.29 "pm2 list"` | 显示 `knowledge-service` 与 `awkn-life-backend` 均 online |
| P3.6-01 | IDF 缓存首次生成 | P3.5 通过 | `ssh root@8.148.245.29 "ls -la /opt/awkn-life/knowledge/processed/idf_cache.pkl"` | 文件存在 |
| P3.6-02 | 冷启动 < 3 秒 | P3.6-01 通过 | `ssh root@8.148.245.29 "pm2 restart knowledge-service && time curl -s http://127.0.0.1:8701/health-v2"` | real < 3s，`v2_initialized: True` |
| P3.7-01 | 本地 health-v2 | P3.6 通过 | `ssh root@8.148.245.29 "curl -s http://127.0.0.1:8701/health-v2"` | `v2_initialized: True`, `vector_count: 137337`, `vector_mode: numpy_in_memory` |
| P3.7-02 | 公网 API 健康 | P3.7-01 通过 | `curl https://awkn.cn/life/api/v1/health` | 200 |
| P3.7-03 | hybrid_search 链路 | P3.7-02 通过 | 查 NestJS 后端日志 `tail -f logs/backend-$(date +%Y-%m-%d).log` | 出现 `hybrid_search` 成功调用记录 |

---

## 5. 回归测试

| ID | 用例 | 验证方法 | 预期 |
|----|------|----------|------|
| REG-01 | awkn-life-backend 进程仍 online | `ssh root@8.148.245.29 "pm2 list"` | `awkn-life-backend` 状态 online，未被影响 |
| REG-02 | 公网 API 正常响应 | `curl https://awkn.cn/life/api/v1/health` | 200，JSON 正常 |
| REG-03 | NestJS consult API 正常 | `curl https://awkn.cn/life/api/v1/consult/...`（带鉴权） | 业务接口不破 |
| REG-04 | 关键词检索回退可用 | 设置 `USE_HYBRID_SEARCH=false` 后请求 consult | 走关键词检索，仍返回结果 |
| REG-05 | 排盘引擎不受影响 | 调用排盘相关 API | 排盘正常（Python3 共用未受 numpy 安装影响） |
| REG-06 | 服务器内存未溢出 | `free -h` + `pm2 monit` | knowledge-service 内存 < 1GB，系统有剩余 |

---

## 6. 风险与缓解

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| 536MB 上传慢/中断 | 高 | P3.3 阻塞 | rsync `--partial --append-verify` 断点续传；网络极差时分片压缩 |
| 服务器路径与本地层级不同导致 `_PROJECT_ROOT` 推算错误 | 中 | P3.4 失败 | 优先采用方案 A（完整镜像层级 `/opt/awkn-life/apps/AWKN-LABlife/services/knowledge-service/`）；方案 B 需新增 `KNOWLEDGE_DATA_DIR` 环境变量覆盖 |
| PM2 管理 Python 兼容性 | 中 | P3.5 失败 | 用 `python3 main.py` 直接启动；或改 systemd 托管 |
| uvicorn 在服务器无法启动 | 低 | P3.5 失败 | 用 gunicorn + uvicorn worker 替代 |
| 内存不足加载 536MB 向量 | 中 | P3.4 OOM | P3.1 先确认可用内存 ≥ 1GB；不足时升级 ECS 配置或启用 swap |
| IDF 缓存 pkl 加载失败 | 低 | P3.6 退化为实时拟合 | 代码 try/except 自动回退实时拟合（37 秒），功能不受影响 |
| numpy 版本与排盘引擎冲突 | 低 | P3.2 失败 | 保留服务器现有 numpy（≥1.20 即可），不强装 1.26.4 |
| 冷启动期间 NestJS 调用超时 | 中 | P3.7 偶发 502 | NestJS 已有 hybrid_search 回退到关键词检索；PM2 重启期间自动降级 |

---

## 7. 工程交接清单

- [ ] P3.1 服务器环境探测通过（Python3 ≥ 3.8 / 内存 ≥ 1GB / 磁盘 ≥ 2GB）
- [ ] P3.2 Python 依赖安装成功（fastapi / uvicorn / numpy 可导入）
- [ ] P3.3 代码与数据上传完成（embeddings.npy 536MB + classics_index.jsonl 137337 行 + main.py）
- [ ] P3.4 路径适配验证通过（`_PROJECT_ROOT=/opt/awkn-life`，`_init_chroma()` 返回 True）
- [ ] P3.5 PM2 配置新增且 `knowledge-service` 进程 online
- [ ] P3.6 IDF 缓存实现（首次生成 idf_cache.pkl，二次冷启动 < 3 秒）
- [ ] P3.7 端到端验证通过（公网健康 + 本地 8701 + hybrid_search 链路）
- [ ] 每个任务有验收用例（共 11 条验收用例）
- [ ] 每个任务有回滚方案（见各步骤"回滚方式"）
- [ ] 部署标准文件已回写（端口 8701 / 仅 127.0.0.1 / PM2 管理 / 路径层级约定）
- [ ] ecosystem.config.js 已提交并同步到服务器
- [ ] 回归测试 REG-01~06 全部通过
- [ ] 部署标准回写至 constitution.md / 部署文档

---

## 8. 部署标准回写要点

P3 完成后需将以下口径回写到项目部署标准文档（constitution.md / [部署文档](file:///c:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/docs/02开发PRD与工程文档/部署文档/deployment-doc.md)）：

- knowledge-service 端口：8701，仅监听 127.0.0.1（不对外）
- knowledge-service 进程管理：PM2（name=`knowledge-service`，exec_mode=fork）
- knowledge-service 部署路径：`/opt/awkn-life/apps/AWKN-LABlife/services/knowledge-service/`（保持完整镜像层级，确保 `_PROJECT_ROOT` 推算正确）
- 知识库产物路径：`/opt/awkn-life/knowledge/processed/`（embeddings.npy / classics_index.jsonl / idf_cache.pkl / _manifest.json）
- embeddings.npy（536MB）不进 Git，走 rsync 直传
- 冷启动标准：< 3 秒（依赖 idf_cache.pkl）
- 回退策略：`USE_HYBRID_SEARCH=false` 回退关键词检索

---

> **下次遇到类似情况，先做哪 3 件事？**
> 1. 查看当前状态（`git status` / 服务器 `pm2 list` / 文件版本）
> 2. 备份当前版本（`git add -A && git commit -m "WIP 备份: $(date +%Y%m%d_%H%M%S)"`）
> 3. 读取完整文件并确认修改位置（路径推算逻辑、端口、环境变量）
