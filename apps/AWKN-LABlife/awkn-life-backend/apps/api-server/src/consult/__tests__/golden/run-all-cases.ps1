# 批量跑 11 条 golden case (minimax provider)
# 用法：powershell -ExecutionPolicy Bypass -File run-all-cases.ps1
# 输出：mvp0-output-<caseId>-minimax.txt + mvp0-bazi-<caseId>-minimax.json

$ErrorActionPreference = 'Continue'
$root = Resolve-Path "$PSScriptRoot"
$apiServer = Resolve-Path "$root\..\..\.."
Set-Location $apiServer

$cases = @(
    'gc-001', 'gc-002', 'gc-003', 'gc-004', 'gc-005',
    'gc-006', 'gc-007', 'gc-008', 'gc-009', 'gc-010', 'gc-011'
)

$logFile = Join-Path $root 'run-all-cases.log'
"===== 开始批量执行 $($cases.Count) 条 case =====" | Out-File -FilePath $logFile -Encoding utf8
$start = Get-Date

foreach ($caseId in $cases) {
    $caseStart = Get-Date
    "`n===== [$caseId] 开始 =====" | Tee-Object -FilePath $logFile -Append | Out-Host

    & npx ts-node (Join-Path $root 'mvp0-runner.ts') $caseId minimax 2>&1 |
        Tee-Object -FilePath $logFile -Append | Out-Host

    $caseEnd = Get-Date
    $caseDuration = ($caseEnd - $caseStart).TotalSeconds
    "===== [$caseId] 完成，耗时 $([math]::Round($caseDuration,1))s =====" | Tee-Object -FilePath $logFile -Append | Out-Host
}

$end = Get-Date
$totalDuration = ($end - $start).TotalSeconds
"`n===== 全部完成，总耗时 $([math]::Round($totalDuration,1))s =====" | Tee-Object -FilePath $logFile -Append | Out-Host
