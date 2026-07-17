param(
    [switch]$Apply
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Set-Location $root

function Normalize-Text([string]$path) {
    $text = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
    return ($text -replace "`r`n", "`n") -replace "`r", "`n"
}

function Remove-VerifiedDuplicate(
    [string]$duplicateRelative,
    [string]$canonicalRelative
) {
    $duplicate = Join-Path $root $duplicateRelative
    $canonical = Join-Path $root $canonicalRelative

    Write-Host ''
    Write-Host '[乱码重复文件]'
    Write-Host ('  DUP: {0}' -f $duplicateRelative)
    Write-Host ('  REF: {0}' -f $canonicalRelative)

    if (-not (Test-Path -LiteralPath $duplicate)) {
        Write-Host '  SKIP: 重复文件不存在'
        return
    }
    if (-not (Test-Path -LiteralPath $canonical)) {
        throw "基准文件不存在：$canonicalRelative"
    }

    $tracked = @(& git ls-files --cached -- $duplicateRelative)
    if ($tracked.Count -gt 0) {
        throw "重复文件已被 Git 跟踪，停止清理：$duplicateRelative"
    }

    $duplicateText = Normalize-Text $duplicate
    $canonicalText = Normalize-Text $canonical
    if ($duplicateText -cne $canonicalText) {
        throw "标准化正文不一致，停止清理：$duplicateRelative"
    }

    Write-Host '  VERIFY: 正文逐字符一致，仅文件名/换行编码异常'
    if (-not $Apply) {
        Write-Host '  MODE: DRY-RUN'
        return
    }

    Remove-Item -LiteralPath $duplicate -Force
    Write-Host '  DONE'
}

function Remove-OfficeLockFile([System.IO.FileInfo]$file) {
    $relative = $file.FullName.Substring($root.Length + 1)
    Write-Host ''
    Write-Host '[Office 临时锁文件]'
    Write-Host ('  FILE: {0}' -f $relative)

    if (-not $file.Name.StartsWith('~$')) {
        throw "文件名不符合 Office 锁文件规则：$relative"
    }
    if ($file.Length -gt 1048576) {
        throw "文件超过 1MB，停止清理：$relative"
    }

    Write-Host ('  VERIFY: 前缀=~$，大小={0} bytes' -f $file.Length)
    if (-not $Apply) {
        Write-Host '  MODE: DRY-RUN'
        return
    }

    Remove-Item -LiteralPath $file.FullName -Force
    Write-Host '  DONE'
}

Write-Host '人生决策宗师｜可验证杂物清理'
Write-Host ('Root: {0}' -f $root)
Write-Host ('Mode: {0}' -f $(if ($Apply) { 'APPLY' } else { 'DRY-RUN' }))

$promptRoot = 'apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/liuren-agent/prompts'
$pairs = @(
    @{
        Duplicate = "$promptRoot/хЕнхгмчеЮчЕЮцА╗шзИ.md"
        Canonical = "$promptRoot/六壬神煞总览.md"
    },
    @{
        Duplicate = "$promptRoot/хИЖч▒╗хНацЦнч║▓шжБ.md"
        Canonical = "$promptRoot/分类占断纲要.md"
    },
    @{
        Duplicate = "$promptRoot/шКВц░ФцЬИх░Жхп╣чЕзшби.md"
        Canonical = "$promptRoot/节气月将对照表.md"
    }
)

foreach ($pair in $pairs) {
    Remove-VerifiedDuplicate -duplicateRelative $pair.Duplicate -canonicalRelative $pair.Canonical
}

$officeLocks = @(
    Get-ChildItem -LiteralPath (Join-Path $root '人生决策智能体') -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -like '~$*' }
)
foreach ($file in $officeLocks) {
    Remove-OfficeLockFile $file
}

Write-Host ''
Write-Host ('核验完成：乱码重复文件 {0} 个，Office 锁文件 {1} 个。' -f $pairs.Count, $officeLocks.Count)
if (-not $Apply) {
    Write-Host '当前为预演模式，没有删除文件。确认结果后显式使用 -Apply。'
}
