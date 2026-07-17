# awkn-工程师 SKILL.md 更新补丁 (v2.8.8 → v2.8.9)

## 需要执行的修改

### 1. 版本号更新 (第7行)
将 `version: v2.8.6` 改为 `version: v2.8.9`

### 2. 在 E88 之前插入 E91 和 E92 (第1110行之前)

在第1110行 `## E88｜多任务计划必须包含验证节奏` 之前，插入以下内容：

```markdown
## E91｜PowerShell 函数隐式输出陷阱（v2.8.9 新增，2026-06-17）

### E91.1 触发条件
- 编写 PowerShell 函数（特别是部署脚本、构建脚本）
- 函数内有管道操作（`|`）或命令输出需要捕获
- 函数需要返回 `$LASTEXITCODE` 或 exit code

### E91.2 核心规则
PowerShell 函数返回所有管道输出，不仅 `return` 语句。必须用 `Out-Null` 吞掉管道输出，用 `Write-Host` 显式输出。

### E91.3 反例
```powershell
function Invoke-BuildCommand {
    npm run build 2>&1 | Tee-Object -FilePath $logFile
    $logContent = Get-Content $logFile -Raw
    return @{ exitCode = $LASTEXITCODE; output = $logContent }
}
```

### E91.4 正例
```powershell
function Invoke-BuildCommand {
    npm run build 2>&1 | Tee-Object -FilePath $logFile | Out-Null
    $exitCode = $LASTEXITCODE
    Write-Host (Get-Content $logFile -Raw | Out-String)
    return $exitCode
}
```

### E91.5 防复发
- 所有 PowerShell 函数内管道操作必须 `| Out-Null` 收尾
- 需要输出到控制台的内容用 `Write-Host`
- 函数返回值只用 `return` 语句

### 教训来源
2026-06-16 部署脚本 exit code 误判修复，3 次迭代

---

## E92｜组件开发→接入 checklist（v2.8.9 新增，2026-06-17）

### E92.1 触发条件
- 新建 React/Vue 组件
- 组件开发完成准备标记"完成"

### E92.2 核心规则
组件开发完成后必须执行 3 步验证：
1. Grep 验证引用：`grep -r "import.*ComponentName" src/`
2. 路由/页面接线：确认组件在 JSX 中被渲染
3. 构建验证：`npm run build` 确认无 import 错误

### E92.3 反例
`BaguaDiagram`、`ConfidenceRing` 等 8 个组件写完 >=30 天从未被任何页面引用。

### E92.4 防复发
- 组件开发 PR 模板增加"接入页面"必填字段
- 定期运行 `npx unimported` 扫描未引用文件
- 触发词：新建组件、组件开发、孤儿组件

### 教训来源
2026-06-16 执行检查孤儿文件扫描：8 个组件从未被导入

---

```

### 3. 版本历史追加 (第1158行之后)

在 `| v2.8.8 | 2026-06-16 | ...` 之后增加：
```
| v2.8.9 | 2026-06-17 | 新增 E91 PowerShell 隐式输出陷阱 + E92 组件开发→接入 checklist（来源：审核修复部署全链路深度复盘） |
```