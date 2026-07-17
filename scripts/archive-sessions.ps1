# archive-sessions.ps1 — 会话记忆归档脚本
# 用法: powershell -File scripts/archive-sessions.ps1
# 功能: 将 >7 天的 session 文件移至 04-backups/

param(
    [string]$SessionsDir = "c:\Users\10919\Desktop\AWKN-Lab\记忆系统\03-sessions",
    [string]$BackupDir = "c:\Users\10919\Desktop\AWKN-Lab\记忆系统\04-backups",
    [int]$DaysThreshold = 7,
    [switch]$DryRun
)

$threshold = (Get-Date).AddDays(-$DaysThreshold)
$monthDir = Join-Path $BackupDir (Get-Date -Format "yyyy-MM")

Write-Host "=== 会话记忆归档 ==="
Write-Host "源目录: $SessionsDir"
Write-Host "备份目录: $monthDir"
Write-Host "归档阈值: >$DaysThreshold 天（$threshold 之前）"
if ($DryRun) { Write-Host "模式: DRY-RUN（仅预览，不实际移动）" }
Write-Host ""

if (!$DryRun -and !(Test-Path $monthDir)) {
    New-Item -ItemType Directory -Path $monthDir -Force | Out-Null
}

$archived = 0
$skipped = 0

if (Test-Path $SessionsDir) {
    Get-ChildItem -Path $SessionsDir -Filter "session-*.md" -ErrorAction SilentlyContinue | Where-Object {
        $_.LastWriteTime -lt $threshold
    } | ForEach-Object {
        if ($DryRun) {
            Write-Host "[DRY-RUN] 将归档: $($_.Name) (修改于 $($_.LastWriteTime.ToString('yyyy-MM-dd')))"
            $archived++
        } else {
            try {
                Move-Item -Path $_.FullName -Destination $monthDir -Force
                Write-Host "[OK] 已归档: $($_.Name)"
                $archived++
            } catch {
                Write-Host "[SKIP] 归档失败: $($_.Name) - $_"
                $skipped++
            }
        }
    }
} else {
    Write-Host "[WARN] 源目录不存在: $SessionsDir"
}

Write-Host ""
Write-Host "=== 归档完成 ==="
Write-Host "已归档: $archived 个文件"
Write-Host "跳过: $skipped 个文件"
