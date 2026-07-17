param(
    [switch]$VerboseFiles
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Set-Location $root

function Get-Bucket([string]$path) {
    $p = $path.Replace('\', '/')

    if ($p -match '^apps/AWKN-LABlife/app/') { return 'A1 前端产品代码' }
    if ($p -match '^apps/AWKN-LABlife/awkn-life-backend/') { return 'A2 后端产品代码' }
    if ($p -match '^apps/AWKN-LABlife/services/knowledge-service/') { return 'A3 知识服务代码' }
    if ($p -match '^apps/AWKN-LABlife/') { return 'A4 主应用其他资产' }

    if ($p -match '^docs/00项目治理/' -or $p -eq 'START-HERE.md' -or $p -eq 'REPO-MAP.md' -or $p -eq 'ONBOARDING.md') {
        return 'B1 项目治理'
    }
    if ($p -match '^docs/01产品定位与PRD/' -or $p -match '^docs/01商业计划/') { return 'B2 产品与商业文档' }
    if ($p -match '^docs/02开发PRD与工程文档/') { return 'B3 当前工程文档' }
    if ($p -match '^docs/03开发过程稿/' -or $p -match '^docs/06IDE配置与记忆/') { return 'B4 历史文档迁移' }
    if ($p -match '^docs/05审核与质量/') { return 'B5 质量治理' }
    if ($p -match '^docs/') { return 'B6 其他文档' }

    if ($p -match '^knowledge/processed/' -or $p -match '^knowledge/asset-ledger/') { return 'C1 知识生产数据' }
    if ($p -match '^knowledge/') { return 'C2 其他知识资产' }

    if ($p -match '^scripts/') { return 'D1 工具与数据脚本' }
    if ($p -match '^人生决策智能体/' -or $p -match '^人生决策宗师-体验升级/') { return 'E1 同项目实验资产' }
    if ($p -match '^lingyang-' -or $p -match '^凌扬运动_' -or $p -eq 'gen_magazine.js') { return 'E2 跨项目资产' }

    if ($p -match '^\.(gitignore|gitattributes)$' -or $p -match '^package(-lock)?\.json$' -or $p -match '^turbo\.json$' -or $p -match '^README\.md$' -or $p -match '^AI-ENTRY-PROTOCOL\.md$' -or $p -match '^KNOWLEDGE-MAP\.md$') {
        return 'F1 根工程配置'
    }

    return 'Z1 待人工分类'
}

function New-PathSet([string[]]$paths) {
    $set = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
    foreach ($path in $paths) {
        if (-not [string]::IsNullOrWhiteSpace($path)) {
            [void]$set.Add($path.Replace('\', '/').Trim('"'))
        }
    }
    return $set
}

function Invoke-GitLines([string[]]$GitArgs) {
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'SilentlyContinue'
    try {
        $output = @(& git @GitArgs 2>$null)
        $exitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousPreference
    }
    if ($exitCode -ne 0) {
        throw "git command failed ($exitCode): git $($GitArgs -join ' ')"
    }
    return $output
}

$unstagedSet = New-PathSet @(Invoke-GitLines @('-c', 'core.quotepath=false', 'diff', '--name-only', '--diff-filter=ACDMRTUXB'))
$stagedSet = New-PathSet @(Invoke-GitLines @('-c', 'core.quotepath=false', 'diff', '--cached', '--name-only', '--diff-filter=ACDMRTUXB'))
$raw = @(Invoke-GitLines @('-c', 'core.quotepath=false', 'status', '--porcelain=v1', '-uall'))

$items = foreach ($line in $raw) {
    if ([string]::IsNullOrWhiteSpace($line) -or $line.Length -lt 4) { continue }

    $xy = $line.Substring(0, 2)
    $path = $line.Substring(3).Trim('"')
    if ($path -like '* -> *') {
        $path = ($path -split ' -> ')[-1].Trim('"')
    }
    $normalizedPath = $path.Replace('\', '/')
    $untracked = $xy -eq '??'
    $deleted = $xy -match 'D'
    $stagedContent = $stagedSet.Contains($normalizedPath)
    $unstagedContent = $unstagedSet.Contains($normalizedPath)
    $contentChanged = $untracked -or $deleted -or $stagedContent -or $unstagedContent

    [pscustomobject]@{
        XY = $xy
        Path = $normalizedPath
        Bucket = Get-Bucket $normalizedPath
        Staged = $stagedContent
        Unstaged = $unstagedContent
        Deleted = $deleted
        Untracked = $untracked
        StatOnly = -not $contentChanged
    }
}

$effectiveItems = @($items | Where-Object { -not $_.StatOnly })
$statOnlyItems = @($items | Where-Object StatOnly)

Write-Host ''
Write-Host '人生决策宗师｜工作区变更分流' -ForegroundColor Cyan
Write-Host ('Root: {0}' -f $root)
Write-Host ('Time: {0:yyyy-MM-dd HH:mm:ss}' -f (Get-Date))
Write-Host ''

Write-Host ('Git 状态项：{0}' -f $items.Count)
Write-Host ('有效内容变更：{0}' -f $effectiveItems.Count) -ForegroundColor Yellow
Write-Host ('stat-only 噪声：{0}' -f $statOnlyItems.Count)
Write-Host ('已暂存内容：{0}' -f @($effectiveItems | Where-Object Staged).Count)
Write-Host ('未暂存内容：{0}' -f @($effectiveItems | Where-Object Unstaged).Count)
Write-Host ('未跟踪：{0}' -f @($effectiveItems | Where-Object Untracked).Count)
Write-Host ('删除项：{0}' -f @($effectiveItems | Where-Object Deleted).Count)
Write-Host ''

Write-Host '按工作流分组（已排除 stat-only）：' -ForegroundColor Cyan
$groups = $effectiveItems | Group-Object Bucket | Sort-Object Name
foreach ($group in $groups) {
    $staged = @($group.Group | Where-Object Staged).Count
    $deleted = @($group.Group | Where-Object Deleted).Count
    $untracked = @($group.Group | Where-Object Untracked).Count
    Write-Host ('  {0,-24} {1,4} 项  staged={2} deleted={3} untracked={4}' -f $group.Name, $group.Count, $staged, $deleted, $untracked)

    if ($VerboseFiles) {
        foreach ($item in $group.Group | Sort-Object Path) {
            Write-Host ('    [{0}] {1}' -f $item.XY, $item.Path)
        }
    }
}

if ($statOnlyItems.Count -gt 0) {
    Write-Host ''
    Write-Host ('stat-only 项：{0} 个，文件内容与索引一致，不进入提交批次。' -f $statOnlyItems.Count) -ForegroundColor DarkYellow
    if ($VerboseFiles) {
        foreach ($item in $statOnlyItems | Sort-Object Path) {
            Write-Host ('    [{0}] {1}' -f $item.XY, $item.Path)
        }
    }
}

Write-Host ''
Write-Host '风险提示：' -ForegroundColor Cyan
if (@($effectiveItems | Where-Object Staged).Count -gt 0 -and @($effectiveItems | Where-Object { $_.Unstaged -or $_.Untracked }).Count -gt 0) {
    Write-Host '  [WARN] 已暂存和未暂存内容并存，提交前需要按工作流核验暂存区。' -ForegroundColor Yellow
}
if (@($effectiveItems | Where-Object Deleted).Count -gt 0) {
    Write-Host ('  [WARN] 当前有 {0} 个删除项，先运行 npm run audit:moves。' -f @($effectiveItems | Where-Object Deleted).Count) -ForegroundColor Yellow
}
if (($effectiveItems | Group-Object Bucket).Count -ge 5) {
    Write-Host '  [WARN] 当前同时跨越多个工作流，建议拆成独立提交或独立分支。' -ForegroundColor Yellow
}
if (@($effectiveItems | Where-Object { $_.Bucket -eq 'E2 跨项目资产' }).Count -gt 0) {
    Write-Host '  [WARN] 发现跨项目资产，应迁回所属项目后再处理当前仓库。' -ForegroundColor Yellow
}

Write-Host ''
Write-Host '建议提交顺序：' -ForegroundColor Cyan
Write-Host '  1. A1-A3 产品代码与测试'
Write-Host '  2. B2-B3 产品和当前工程文档'
Write-Host '  3. C1、D1 知识数据与数据脚本'
Write-Host '  4. B4 历史文档迁移'
Write-Host '  5. B1、B5、F1 项目与质量治理'
Write-Host ''
Write-Host '脚本只读，未修改文件。'
