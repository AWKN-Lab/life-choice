#!/usr/bin/env pwsh
# 提醒归档索引更新（post-commit hook，不阻塞 commit）
# 用法：在 .husky/post-commit 中调用 powershell -File scripts/remind-archive.ps1

$archiveIndex = "docs/03开发过程稿/已完成执行计划归档索引.md"
$trackingFile = "docs/06IDE配置与记忆/.last-archive-reminder"

if (-not (Test-Path $archiveIndex)) {
    exit 0
}

# 读取归档索引首行日期
$firstLines = Get-Content $archiveIndex -TotalCount 5 | Where-Object { $_ -match "归档时间" }
if ($firstLines.Count -eq 0) {
    exit 0
}

# 提取日期
if ($firstLines[0] -match "(\d{4}-\d{2}-\d{2})") {
    $archiveDate = [DateTime]::Parse($matches[1])
    $daysSinceArchive = ((Get-Date) - $archiveDate).Days

    # 超过 7 天未更新归档索引，输出提醒
    if ($daysSinceArchive -ge 7) {
        Write-Host ""
        Write-Host "[归档提醒] 归档索引已 $daysSinceArchive 天未更新（最后：$($matches[1])）" -ForegroundColor Yellow
        Write-Host "[归档提醒] 如本次 commit 涉及新文档/工程交接/PRD/复盘，请更新：$archiveIndex" -ForegroundColor Yellow
        Write-Host "[归档提醒] 并登记到期承诺到：docs/06IDE配置与记忆/治理到期跟踪.md" -ForegroundColor Yellow
        Write-Host ""
    }
}

exit 0
