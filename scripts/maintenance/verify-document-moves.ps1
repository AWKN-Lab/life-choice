param(
    [switch]$VerboseFiles
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Set-Location $root

function Get-GitBlobHash([string]$revisionPath) {
    $hash = (& git rev-parse $revisionPath 2>$null)
    if ($LASTEXITCODE -ne 0) { return $null }
    return ($hash | Select-Object -First 1).Trim()
}

function Get-FileBlobHash([string]$path) {
    $hash = (& git hash-object -- $path 2>$null)
    if ($LASTEXITCODE -ne 0) { return $null }
    return ($hash | Select-Object -First 1).Trim()
}

function Get-ExpectedTarget([string]$oldPath) {
    $normalized = $oldPath.Replace('\', '/')

    $rules = @(
        @{
            Prefix = 'docs/03开发过程稿/进行中执行计划/'
            Target = 'docs/03开发过程稿/已完成执行计划/'
        },
        @{
            Prefix = 'docs/06IDE配置与记忆/TRAE配置/documents/'
            Target = 'docs/03开发过程稿/历史归档/06IDE-documents-STALE-20260711/'
        },
        @{
            Prefix = 'docs/06IDE配置与记忆/TRAE配置/specs/'
            Target = 'docs/03开发过程稿/历史归档/06IDE-specs-STALE-20260711/'
        }
    )

    foreach ($rule in $rules) {
        if ($normalized.StartsWith($rule.Prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
            $suffix = $normalized.Substring($rule.Prefix.Length)
            return $rule.Target + $suffix
        }
    }

    return $null
}

$deleted = @(
    git -c core.quotepath=false status --porcelain=v1 -uall |
        Where-Object { $_.Length -ge 4 -and $_.Substring(0, 2) -match 'D' } |
        ForEach-Object { $_.Substring(3).Trim('"') } |
        Where-Object { $_ -like 'docs/*' }
)

$results = foreach ($oldPath in $deleted) {
    $fileName = [System.IO.Path]::GetFileName($oldPath)
    $oldNormalized = $oldPath.Replace('\', '/')
    $expectedTarget = Get-ExpectedTarget $oldNormalized

    if ($expectedTarget -and (Test-Path -LiteralPath (Join-Path $root $expectedTarget))) {
        $candidates = @($expectedTarget)
    } else {
        $candidates = @(
            Get-ChildItem -LiteralPath (Join-Path $root 'docs') -Recurse -File -Filter $fileName -ErrorAction SilentlyContinue |
                ForEach-Object {
                    $relative = $_.FullName.Substring($root.Length + 1).Replace('\', '/')
                    if ($relative -ne $oldNormalized) { $relative }
                } |
                Sort-Object -Unique
        )
    }

    $oldHash = Get-GitBlobHash ('HEAD:' + $oldNormalized)

    if ($candidates.Count -eq 0) {
        [pscustomobject]@{
            Status = 'MISSING'
            OldPath = $oldNormalized
            NewPath = ''
            OldHash = $oldHash
            NewHash = ''
        }
        continue
    }

    if ($candidates.Count -gt 1) {
        [pscustomobject]@{
            Status = 'AMBIGUOUS'
            OldPath = $oldNormalized
            NewPath = ($candidates -join ' | ')
            OldHash = $oldHash
            NewHash = ''
        }
        continue
    }

    $newPath = $candidates[0]
    $newHash = Get-FileBlobHash $newPath
    $status = if ($oldHash -and $newHash -and $oldHash -eq $newHash) { 'EXACT' } else { 'UPDATED' }

    [pscustomobject]@{
        Status = $status
        OldPath = $oldNormalized
        NewPath = $newPath
        OldHash = $oldHash
        NewHash = $newHash
    }
}

Write-Host ''
Write-Host '人生决策宗师｜历史文档迁移核验' -ForegroundColor Cyan
Write-Host ('Root: {0}' -f $root)
Write-Host ('Time: {0:yyyy-MM-dd HH:mm:ss}' -f (Get-Date))
Write-Host ''

Write-Host ('删除文档：{0}' -f $results.Count)
Write-Host ('纯移动：{0}' -f @($results | Where-Object Status -eq 'EXACT').Count)
Write-Host ('移动后更新：{0}' -f @($results | Where-Object Status -eq 'UPDATED').Count)
Write-Host ('同名冲突：{0}' -f @($results | Where-Object Status -eq 'AMBIGUOUS').Count)
Write-Host ('目标缺失：{0}' -f @($results | Where-Object Status -eq 'MISSING').Count)
Write-Host ''

foreach ($group in $results | Group-Object Status | Sort-Object Name) {
    Write-Host ('[{0}] {1} 项' -f $group.Name, $group.Count) -ForegroundColor Yellow
    if ($VerboseFiles -or $group.Name -ne 'EXACT') {
        foreach ($item in $group.Group | Sort-Object OldPath) {
            Write-Host ('  OLD: {0}' -f $item.OldPath)
            Write-Host ('  NEW: {0}' -f $item.NewPath)
            if ($item.Status -eq 'UPDATED') {
                Write-Host ('  HASH: {0} -> {1}' -f $item.OldHash, $item.NewHash)
            }
        }
    }
}

Write-Host ''
if (@($results | Where-Object { $_.Status -in @('MISSING', 'AMBIGUOUS') }).Count -gt 0) {
    Write-Host '[BLOCK] 存在目标缺失或同名冲突，迁移批次不能提交。' -ForegroundColor Red
    exit 2
}

Write-Host '[PASS] 所有删除文档都有唯一目标位置。' -ForegroundColor Green
if (@($results | Where-Object Status -eq 'UPDATED').Count -gt 0) {
    Write-Host '[REVIEW] 部分文件移动后有内容变化，需要人工确认差异。' -ForegroundColor Yellow
}
Write-Host '脚本只读，未修改文件。'
