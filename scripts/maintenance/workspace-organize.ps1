param(
    [string]$Root = "",
    [string]$LingyangRoot = "",
    [switch]$Apply,
    [switch]$ForceDirty
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

if ([string]::IsNullOrWhiteSpace($Root)) {
    $Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
} else {
    $Root = (Resolve-Path $Root).Path
}

function Resolve-TargetPath([string]$RelativePath) {
    return Join-Path $Root $RelativePath
}

function Get-WorkspaceRisk {
    Push-Location $Root
    try {
        $status = @(git -c core.quotepath=false status --porcelain=v1 -uall)
    } finally {
        Pop-Location
    }

    $deleted = @($status | Where-Object {
        $_.Length -ge 2 -and $_.Substring(0, 2) -match 'D'
    })

    return [pscustomobject]@{
        ChangeCount = $status.Count
        DeletedCount = $deleted.Count
    }
}

function Move-Safely(
    [string]$Source,
    [string]$Target,
    [string]$Reason
) {
    if (-not (Test-Path -LiteralPath $Source)) {
        return
    }

    Write-Host ""
    Write-Host "[$Reason]"
    Write-Host "  FROM: $Source"
    Write-Host "  TO:   $Target"

    if (-not $Apply) {
        Write-Host "  MODE: DRY-RUN"
        return
    }

    if (Test-Path -LiteralPath $Target) {
        throw "目标已存在，停止移动：$Target"
    }

    $targetDirectory = Split-Path -Parent $Target
    if (-not (Test-Path -LiteralPath $targetDirectory)) {
        New-Item -ItemType Directory -Path $targetDirectory -Force | Out-Null
    }

    Move-Item -LiteralPath $Source -Destination $Target
    Write-Host "  DONE"
}

$workspaceRisk = Get-WorkspaceRisk

Write-Host "人生决策宗师根目录整理"
Write-Host "Root: $Root"
Write-Host "Mode: $(if ($Apply) { 'APPLY' } else { 'DRY-RUN' })"
Write-Host "Workspace changes: $($workspaceRisk.ChangeCount)"
Write-Host "Workspace deletions: $($workspaceRisk.DeletedCount)"
Write-Host ""
Write-Host "保护范围：apps、knowledge、docs 现有业务文档、恢复资产和数据库均不移动。"

if ($Apply -and -not $ForceDirty) {
    if ($workspaceRisk.ChangeCount -gt 25) {
        throw "当前工作区有 $($workspaceRisk.ChangeCount) 项变更。请先按工作流收口，或显式使用 -ForceDirty 确认高风险执行。"
    }
    if ($workspaceRisk.DeletedCount -gt 0) {
        throw "当前工作区有 $($workspaceRisk.DeletedCount) 个删除项。请先核验迁移目标，或显式使用 -ForceDirty 确认高风险执行。"
    }
}

$rootMoves = @(
    @{ Source = ".deploy-awkn-life-min.sh"; Target = "scripts\deploy\legacy-root\.deploy-awkn-life-min.sh"; Reason = "部署脚本归位" },
    @{ Source = ".deploy-awkn-profile-only.sh"; Target = "scripts\deploy\legacy-root\.deploy-awkn-profile-only.sh"; Reason = "部署脚本归位" },
    @{ Source = ".deploy-awkn-tide-only.sh"; Target = "scripts\deploy\legacy-root\.deploy-awkn-tide-only.sh"; Reason = "部署脚本归位" },
    @{ Source = "_tmp_engineer_skill.md"; Target = "_archive\tmp\skills\_tmp_engineer_skill.md"; Reason = "临时技能归档" },
    @{ Source = "_tmp_retro_skill.md"; Target = "_archive\tmp\skills\_tmp_retro_skill.md"; Reason = "临时技能归档" },
    @{ Source = "_tmp_review_skill.md"; Target = "_archive\tmp\skills\_tmp_review_skill.md"; Reason = "临时技能归档" },
    @{ Source = "_tmp_append-tianhuo-life.ps1"; Target = "_archive\tmp\scripts\_tmp_append-tianhuo-life.ps1"; Reason = "临时脚本归档" },
    @{ Source = "backend-dist-e49d87d3.zip"; Target = "_archive\builds\20260703\backend-dist-e49d87d3.zip"; Reason = "构建产物归档" },
    @{ Source = "frontend-dist-e49d87d3.zip"; Target = "_archive\builds\20260703\frontend-dist-e49d87d3.zip"; Reason = "构建产物归档" },
    @{ Source = "prod-atom-tools.tar.gz"; Target = "_archive\packages\prod-atom-tools.tar.gz"; Reason = "工具包归档" },
    @{ Source = "commit-output.log"; Target = "_archive\runtime\commit-output.log"; Reason = "日志归档" },
    @{ Source = "test-output.txt"; Target = "_archive\runtime\test-output.txt"; Reason = "测试输出归档" },
    @{ Source = "SHARED_CONTEXT.md.bak"; Target = "_archive\backups\context\SHARED_CONTEXT.md.bak"; Reason = "上下文备份归档" },
    @{ Source = "nul"; Target = "_archive\tmp\anomalies\nul"; Reason = "异常文件隔离" },
    @{ Source = "--css"; Target = "_archive\tmp\anomalies\--css"; Reason = "异常文件隔离" },
    @{ Source = "案例.docx"; Target = "docs\03开发过程稿\案例素材\案例.docx"; Reason = "案例材料归位" },
    @{ Source = "项目梳理规划方案_v1.md"; Target = "docs\00项目治理\历史规划\项目梳理规划方案_v1.md"; Reason = "历史治理文档归位" }
)

foreach ($item in $rootMoves) {
    Move-Safely -Source (Resolve-TargetPath $item.Source) -Target (Resolve-TargetPath $item.Target) -Reason $item.Reason
}

$lingyangItems = @(
    "凌扬运动_极简杂志风.pptx",
    "凌扬运动_商务深蓝风.pptx",
    "凌扬运动_活力运动风.pptx",
    "gen_magazine.js",
    "lingyang-investment-deck",
    "lingyang-investment-deck-v2"
)

Write-Host ""
Write-Host "凌扬运动跨项目资产"
if ([string]::IsNullOrWhiteSpace($LingyangRoot)) {
    foreach ($item in $lingyangItems) {
        $source = Resolve-TargetPath $item
        if (Test-Path -LiteralPath $source) {
            Write-Host "  [WAIT] $item — 需要通过 -LingyangRoot 指定凌扬项目目录"
        }
    }
} else {
    if (-not (Test-Path -LiteralPath $LingyangRoot)) {
        if ($Apply) {
            New-Item -ItemType Directory -Path $LingyangRoot -Force | Out-Null
        } else {
            Write-Host "  [DRY-RUN] 目标目录尚不存在：$LingyangRoot"
        }
    }

    foreach ($item in $lingyangItems) {
        Move-Safely -Source (Resolve-TargetPath $item) -Target (Join-Path $LingyangRoot $item) -Reason "跨项目资产归位"
    }
}

Write-Host ""
Write-Host "完成。"
if (-not $Apply) {
    Write-Host "当前为预演模式，没有移动文件。确认清单后使用 -Apply。"
}
