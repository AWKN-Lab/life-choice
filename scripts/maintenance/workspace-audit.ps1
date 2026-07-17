param(
    [string]$Root = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

if ([string]::IsNullOrWhiteSpace($Root)) {
    $Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
} else {
    $Root = (Resolve-Path $Root).Path
}

function Write-Section([string]$Title) {
    Write-Host ""
    Write-Host ("=" * 72)
    Write-Host $Title
    Write-Host ("=" * 72)
}

function Test-Exists([string]$RelativePath) {
    return Test-Path (Join-Path $Root $RelativePath)
}

$allowedRootFiles = @(
    ".gitignore",
    ".lintstagedrc.json",
    "AI-ENTRY-PROTOCOL.md",
    "KNOWLEDGE-MAP.md",
    "ONBOARDING.md",
    "PLAN.md",
    "README.md",
    "REPO-MAP.md",
    "SHARED_CONTEXT.md",
    "START-HERE.md",
    "commitlint.config.js",
    "constitution.md",
    "package-lock.json",
    "package.json",
    "turbo.json"
)

$allowedRootDirectories = @(
    ".git",
    ".github",
    ".husky",
    ".memory",
    ".trae",
    "_archive",
    "apps",
    "docs",
    "knowledge",
    "references",
    "reports",
    "scripts",
    "记忆系统"
)

$ignoredRuntimeDirectories = @(
    ".cursor",
    ".deploy",
    ".mineru-env",
    ".pytest_cache",
    ".ruff_cache",
    ".turbo",
    ".uploads",
    "_prod_review",
    "node_modules"
)

$highRiskPatterns = @(
    "*.zip",
    "*.tar.gz",
    "*.tgz",
    "*.pptx",
    "*.docx",
    "*.log",
    "_tmp_*"
)

Write-Host "人生决策宗师工作区审计"
Write-Host "Root: $Root"
Write-Host "Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

Write-Section "1. 关键入口"
$requiredEntries = @(
    "START-HERE.md",
    "README.md",
    "docs\文档索引.md",
    "docs\01产品定位与PRD",
    "docs\02开发PRD与工程文档\工程交接\ENGINEERING-当前生产技术基线-20260707.md",
    "apps\AWKN-LABlife",
    "knowledge\processed",
    "knowledge\asset-ledger"
)
foreach ($entry in $requiredEntries) {
    $state = if (Test-Exists $entry) { "OK" } else { "MISSING" }
    Write-Host ("[{0,-7}] {1}" -f $state, $entry)
}

Write-Section "2. Git 工作区"
Push-Location $Root
try {
    $branch = (& git branch --show-current 2>$null)
    $head = (& git log -1 --oneline 2>$null)
    $status = @(& git status --short 2>$null)
    Write-Host "Branch: $branch"
    Write-Host "HEAD:   $head"
    Write-Host "Changes: $($status.Count)"
    if ($status.Count -gt 0) {
        $status | Select-Object -First 30 | ForEach-Object { Write-Host "  $_" }
        if ($status.Count -gt 30) {
            Write-Host "  ... 其余 $($status.Count - 30) 项未展开"
        }
    }
} finally {
    Pop-Location
}

Write-Section "3. 根目录契约"
$unexpected = @()
$runtimeItems = @()
Get-ChildItem -LiteralPath $Root -Force | ForEach-Object {
    if ($_.PSIsContainer) {
        if ($ignoredRuntimeDirectories -contains $_.Name) {
            $runtimeItems += [PSCustomObject]@{ Type = "RUNTIME"; Name = $_.Name }
        } elseif ($allowedRootDirectories -notcontains $_.Name) {
            $unexpected += [PSCustomObject]@{ Type = "DIR"; Name = $_.Name }
        }
    } else {
        if ($allowedRootFiles -notcontains $_.Name) {
            $unexpected += [PSCustomObject]@{ Type = "FILE"; Name = $_.Name }
        }
    }
}

if ($runtimeItems.Count -gt 0) {
    Write-Host "[INFO] Git 忽略的缓存/运行时目录：$($runtimeItems.Count) 个"
    Write-Host ("  " + (($runtimeItems | Sort-Object Name | ForEach-Object { $_.Name }) -join ", "))
}

if ($unexpected.Count -eq 0) {
    Write-Host "[OK] 根目录符合允许清单"
} else {
    Write-Host "[WARN] 发现 $($unexpected.Count) 个需要归位或评审的项目"
    $unexpected | Sort-Object Type, Name | Format-Table -AutoSize
}

Write-Section "4. 根目录高风险文件"
$highRiskFiles = @()
foreach ($pattern in $highRiskPatterns) {
    $highRiskFiles += Get-ChildItem -LiteralPath $Root -File -Force -Filter $pattern -ErrorAction SilentlyContinue
}
$highRiskFiles = $highRiskFiles | Sort-Object FullName -Unique
if ($highRiskFiles.Count -eq 0) {
    Write-Host "[OK] 未发现压缩包、PPT、DOCX、日志或临时文件"
} else {
    $highRiskFiles | Select-Object Name, Length, LastWriteTime | Format-Table -AutoSize
}

Write-Section "5. 已知隔离目录"
$reviewDirectories = @(
    "_tmp_runtime_logs",
    "_backup_chroma_db_20260625",
    "_recovered_assets",
    "_dangling_probe",
    "backend-backups",
    "server-backups",
    "dangling-probe-analysis",
    "人生决策宗师-体验升级",
    "人生决策智能体",
    "lingyang-investment-deck",
    "lingyang-investment-deck-v2",
    "ziwei-doushu"
)
foreach ($dir in $reviewDirectories) {
    if (Test-Exists $dir) {
        Write-Host "[REVIEW] $dir"
    }
}

Write-Section "6. 知识目录职责"
$knowledgeChecks = @(
    @{ Path = "knowledge\processed"; Role = "生产索引与处理产物" },
    @{ Path = "knowledge\asset-ledger"; Role = "资产台账与来源链" },
    @{ Path = "knowledge\eastern-metaphysics"; Role = "原始知识资料" },
    @{ Path = "knowledge\knowledge_base\metaphysics.db"; Role = "只读冷备数据库" },
    @{ Path = "knowledge\knowledge-base"; Role = "历史知识工程，待拆分" }
)
foreach ($item in $knowledgeChecks) {
    $state = if (Test-Exists $item.Path) { "FOUND" } else { "MISSING" }
    Write-Host ("[{0,-7}] {1} — {2}" -f $state, $item.Path, $item.Role)
}

Write-Section "7. 建议"
Write-Host "1. 先查看 docs/00项目治理/根目录清理清单-20260711.md。"
Write-Host "2. 当前有未提交代码时，暂停批量移动。"
Write-Host "3. 跨项目资产、构建包、日志和临时文件优先离开根目录。"
Write-Host "4. 知识目录调整前先扫描路径引用并建立回滚点。"
Write-Host ""
Write-Host "审计完成。脚本只读，未修改任何文件。"
