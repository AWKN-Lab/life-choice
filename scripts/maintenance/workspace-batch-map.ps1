param(
    [string]$Batch = '',
    [switch]$VerboseFiles,
    [switch]$GitAddCommand,
    [switch]$Strict
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Set-Location $root

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

function Get-Batch([string]$path) {
    $p = $path.Replace('\', '/')

    $backendHighRisk = @(
        'apps/AWKN-LABlife/awkn-life-backend/apps/api-server/prisma/schema.prisma',
        'apps/AWKN-LABlife/awkn-life-backend/apps/api-server/assets-manifest.json',
        'apps/AWKN-LABlife/awkn-life-backend/apps/api-server/package-lock.json',
        'apps/AWKN-LABlife/awkn-life-backend/package-lock.json',
        'apps/AWKN-LABlife/awkn-life-backend/yarn.lock',
        'apps/AWKN-LABlife/awkn-life-backend/package.json',
        '.github/workflows/ci.yml',
        'apps/AWKN-LABlife/DEPLOY.md'
    )
    if ($backendHighRisk -contains $p) { return 'B0 后端边界修复' }

    if ($p -match '^docs/03开发过程稿/(进行中执行计划|已完成执行计划|历史归档/06IDE-(documents|specs)-STALE-20260711)/' -or
        $p -match '^docs/06IDE配置与记忆/TRAE配置/(documents|specs)/') {
        return 'D1 历史文档迁移'
    }

    $knowledgeImport = @(
        'knowledge/processed/classics_index.jsonl',
        'scripts/__tests__/test_knowledge_ingest.py',
        'scripts/_fix_null_bytes_first2.py',
        'scripts/ingest_md_converted.py',
        'scripts/knowledge_ingest.py'
    )
    if ($knowledgeImport -contains $p) { return 'K1 知识导入与索引' }

    $vectorV3 = @(
        'apps/AWKN-LABlife/services/knowledge-service/main.py',
        'knowledge/processed/l8_v3_evaluation.jsonl',
        'scripts/eval_v3_vs_v2.py',
        'scripts/__tests__/test_v3_switch.py'
    )
    if ($vectorV3 -contains $p) { return 'K2 向量检索 v3' }

    $analyticsFiles = @(
        'apps/AWKN-LABlife/app/src/lib/analytics.ts',
        'apps/AWKN-LABlife/app/src/lib/analytics.test.ts',
        'apps/AWKN-LABlife/app/src/main.tsx',
        'apps/AWKN-LABlife/app/src/pages/AdminPage.tsx',
        'apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/analytics/analytics.controller.ts',
        'apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/analytics/analytics.module.ts',
        'apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/analytics/analytics.service.ts',
        'apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/analytics/analytics.service.spec.ts',
        'apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/analytics/api-metrics-collector.service.ts',
        'apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/analytics/api-metrics-collector.service.spec.ts',
        'apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/main.ts'
    )
    if ($analyticsFiles -contains $p) { return 'P1 经营看板与错误采集' }

    $mojibakePrompts = @(
        'apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/liuren-agent/prompts/хЕнхгмчеЮчЕЮцА╗шзИ.md',
        'apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/liuren-agent/prompts/хИЖч▒╗хНацЦнч║▓шжБ.md',
        'apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/liuren-agent/prompts/шКВц░ФцЬИх░Жхп╣чЕзшби.md'
    )
    if ($mojibakePrompts -contains $p) { return 'G0 可验证杂物' }

    $frontdeskExact = @(
        'apps/AWKN-LABlife/app/src/api/consult.ts',
        'apps/AWKN-LABlife/app/src/pages/KlinePage.tsx',
        'apps/AWKN-LABlife/app/src/locales/en/translation.json',
        'apps/AWKN-LABlife/app/src/locales/th/translation.json',
        'apps/AWKN-LABlife/app/src/locales/zh-CN/translation.json',
        'apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/consult.controller.ts',
        'apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/consult.service.ts',
        'apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/naming-selection-state.ts',
        'apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/naming-selection-state.spec.ts',
        'apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/orchestrator.service.ts',
        'apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/zhangbanshan-scheduler.service.ts',
        'apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/dto/naming-contract.spec.ts',
        'apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/__tests__/golden/mvp0-output-gc-005-minimax.gc-005.result.json',
        'apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/__tests__/behavior.controller.spec.ts'
    )
    if ($frontdeskExact -contains $p -or
        $p.StartsWith('apps/AWKN-LABlife/app/src/components/frontdesk/', [System.StringComparison]::OrdinalIgnoreCase) -or
        $p.StartsWith('apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/behavior/', [System.StringComparison]::OrdinalIgnoreCase) -or
        $p -match '^apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/(kline-tide|quming-agent)/.*\.spec\.ts$') {
        return 'P2 统一前台联动'
    }

    if ($p -match '^docs/(01产品定位与PRD|01商业计划|02产品需求 \(PRD\)|02开发PRD与工程文档)/' -or
        $p -eq 'docs/pre-launch-analysis.md') {
        return 'P3 产品与工程文档'
    }

    if ($p -match '^docs/05审核与质量/' -or $p -eq 'scripts/scan-stale-docs.ps1') { return 'Q1 质量治理' }

    if ($p -eq 'docs/文档索引.md') { return 'S1 共享文档索引' }

    if ($p -match '^docs/00项目治理/' -or
        $p -match '^scripts/maintenance/' -or
        $p -in @('.gitattributes', '.gitignore', 'START-HERE.md', 'README.md', 'ONBOARDING.md', 'REPO-MAP.md', 'package.json', 'AI-ENTRY-PROTOCOL.md', 'KNOWLEDGE-MAP.md') -or
        $p -eq 'apps/AWKN-LABlife/awkn-life-backend/.gitignore') {
        return 'G1 项目治理'
    }

    if ($p -match '^(人生决策智能体|人生决策宗师-体验升级)/') { return 'E1 实验与设计资产' }

    if ($p -match '^knowledge/') { return 'KX 其他知识资产' }
    if ($p -match '^scripts/') { return 'SX 其他脚本' }
    if ($p -match '^apps/AWKN-LABlife/') { return 'PX 其他产品代码' }
    if ($p -match '^docs/') { return 'DX 其他文档' }

    return 'ZX 待人工分类'
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
    $p = $path.Replace('\', '/')
    $untracked = $xy -eq '??'
    $deleted = $xy -match 'D'
    $staged = $stagedSet.Contains($p)
    $unstaged = $unstagedSet.Contains($p)
    $effective = $untracked -or $deleted -or $staged -or $unstaged

    if ($effective) {
        [pscustomobject]@{
            XY = $xy
            Path = $p
            Batch = Get-Batch $p
            Staged = $staged
            Unstaged = $unstaged
            Untracked = $untracked
            Deleted = $deleted
        }
    }
}

$selected = if ([string]::IsNullOrWhiteSpace($Batch)) {
    @($items)
} else {
    @($items | Where-Object { $_.Batch -like "$Batch*" })
}

Write-Host ''
Write-Host '人生决策宗师｜提交批次地图' -ForegroundColor Cyan
Write-Host ('Root: {0}' -f $root)
Write-Host ('Time: {0:yyyy-MM-dd HH:mm:ss}' -f (Get-Date))
if (-not [string]::IsNullOrWhiteSpace($Batch)) {
    Write-Host ('Filter: {0}' -f $Batch)
}
Write-Host ''

$groups = $selected | Group-Object Batch | Sort-Object Name
foreach ($group in $groups) {
    $stagedCount = @($group.Group | Where-Object Staged).Count
    $deletedCount = @($group.Group | Where-Object Deleted).Count
    $untrackedCount = @($group.Group | Where-Object Untracked).Count
    Write-Host ('{0,-28} {1,4} 项  staged={2} deleted={3} untracked={4}' -f $group.Name, $group.Count, $stagedCount, $deletedCount, $untrackedCount)

    if ($VerboseFiles -or -not [string]::IsNullOrWhiteSpace($Batch)) {
        foreach ($item in $group.Group | Sort-Object Path) {
            Write-Host ('  [{0}] {1}' -f $item.XY, $item.Path)
        }
    }
    Write-Host ''
}

$manual = @($items | Where-Object { $_.Batch -match '^(KX|SX|PX|DX|ZX)' })
Write-Host ('总有效项：{0}' -f $items.Count)
Write-Host ('已进入明确批次：{0}' -f ($items.Count - $manual.Count))
Write-Host ('待人工归类：{0}' -f $manual.Count)

if ($manual.Count -gt 0) {
    Write-Host ''
    Write-Host '[REVIEW] 待人工归类项' -ForegroundColor Yellow
    foreach ($item in $manual | Sort-Object Batch, Path) {
        Write-Host ('  {0}｜{1}' -f $item.Batch, $item.Path)
    }
}

if ($GitAddCommand) {
    if ([string]::IsNullOrWhiteSpace($Batch)) {
        Write-Host ''
        Write-Host '[BLOCK] 生成 git add 命令时必须指定 -Batch。' -ForegroundColor Red
        if ($Strict) { exit 2 }
    } elseif ($selected.Count -eq 0) {
        Write-Host ''
        Write-Host '[BLOCK] 当前批次没有文件。' -ForegroundColor Red
        if ($Strict) { exit 2 }
    } else {
        Write-Host ''
        Write-Host '建议命令（仅打印，未执行）：' -ForegroundColor Cyan
        Write-Host 'git add --'
        foreach ($item in $selected | Sort-Object Path) {
            $escaped = $item.Path.Replace("'", "''")
            Write-Host ("  '{0}'" -f $escaped)
        }
    }
}

if ($Strict -and $manual.Count -gt 0) {
    exit 2
}

Write-Host ''
Write-Host '脚本只读，未修改暂存区或工作区。'
