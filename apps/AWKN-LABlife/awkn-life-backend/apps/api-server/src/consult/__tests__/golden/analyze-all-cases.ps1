# 批量 analyze 11 条 golden case 输出
# 用法：powershell -ExecutionPolicy Bypass -File analyze-all-cases.ps1

$ErrorActionPreference = 'Continue'
$root = Resolve-Path "$PSScriptRoot"
$apiServer = Resolve-Path "$root\..\..\.."
Set-Location $apiServer

$cases = @(
    'gc-001', 'gc-002', 'gc-003', 'gc-004', 'gc-005',
    'gc-006', 'gc-007', 'gc-008', 'gc-009', 'gc-010', 'gc-011'
)

$logFile = Join-Path $root 'analyze-all-cases.log'
"===== 开始批量 analyze $($cases.Count) 条 case =====" | Out-File -FilePath $logFile -Encoding utf8 -Force
$start = Get-Date

$summary = @()

foreach ($caseId in $cases) {
    "`n===== [$caseId] analyze 开始 =====" | Tee-Object -FilePath $logFile -Append | Out-Host

    $outputFile = Join-Path $root "mvp0-output-$caseId-minimax.txt"
    if (-not (Test-Path $outputFile)) {
        "  ❌ 输出文件不存在：$outputFile" | Tee-Object -FilePath $logFile -Append | Out-Host
        continue
    }

    $resultJson = & npx ts-node (Join-Path $root 'golden-case-runner.ts') --analyze $outputFile $caseId 2>&1 |
        Tee-Object -FilePath $logFile -Append | Out-Host

    $resultPath = "$outputFile.$caseId.result.json"
    if (Test-Path $resultPath) {
        $result = Get-Content $resultPath -Raw | ConvertFrom-Json
        $summary += [PSCustomObject]@{
            caseId = $caseId
            passed = $result.passed
            segmentsCount = $result.segmentsCount
            score = $result.score
            scoreInRange = $result.scoreInRange
            riskLevel = $result.riskLevel
            riskMatch = $result.riskMatch
            keywordsHitCount = $result.keywordsHitCount
            redLinesFoundCount = $result.redLinesFound.Count
            failureReasons = ($result.failureReasons -join '; ')
        }
    }
}

"`n`n===== 汇总 =====" | Tee-Object -FilePath $logFile -Append | Out-Host
$summary | Format-Table -AutoSize | Tee-Object -FilePath $logFile -Append | Out-Host

# 保存汇总 JSON
$summaryFile = Join-Path $root 'summary-all-cases.json'
$summary | ConvertTo-Json -Depth 5 | Out-File -FilePath $summaryFile -Encoding utf8
"汇总已保存：$summaryFile" | Tee-Object -FilePath $logFile -Append | Out-Host

$end = Get-Date
$totalDuration = ($end - $start).TotalSeconds
"`n===== 全部完成，总耗时 $([math]::Round($totalDuration,1))s =====" | Tee-Object -FilePath $logFile -Append | Out-Host
