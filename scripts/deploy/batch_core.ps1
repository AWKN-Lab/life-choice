# 核心六壬扫描版 PDF -> MD 批量转换
# MinerU VLM OCR，顺序处理，进度保存
param()

$mineru = "C:\Users\10919\.claude\skills\awkn-mineru\skills\.venv-mineru\Scripts\mineru.exe"
$pdfDir = "C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\东方术数\六壬"
$outBase = "C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\md_converted\东方术数\六壬"
$logFile = Join-Path $outBase "_core_log.txt"
$progressFile = Join-Path $outBase "_core_progress.json"

$env:HF_ENDPOINT = "https://hf-mirror.com"

$coreFiles = @(
    "六壬断案详解.pdf",
    "六壬指南例题解.pdf",
    "大六壬高级预测学.pdf",
    "六壬大全.pdf",
    "韦千里大六壬全集.pdf"
)

function Write-Log($msg) {
    $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $msg"
    Write-Host $line
    Add-Content -Path $logFile -Value $line
}

if (Test-Path $progressFile) {
    $progress = Get-Content $progressFile -Raw | ConvertFrom-Json
} else {
    $progress = @{ completed = @(); failed = @() } | ConvertTo-Json | ConvertFrom-Json
}

$completed = [System.Collections.Generic.HashSet[string]]::new([string[]]$progress.completed)
$failed = [System.Collections.Generic.HashSet[string]]::new([string[]]$progress.failed)

$pending = @()
foreach ($name in $coreFiles) {
    if ($completed.Contains($name) -or $failed.Contains($name)) { continue }
    $pdfPath = Join-Path $pdfDir $name
    if (-not (Test-Path $pdfPath)) {
        Write-Log "SKIP 文件不存在: $name"
        continue
    }
    $pending += @{ Name = $name; Path = $pdfPath; SizeKB = [math]::Round((Get-Item $pdfPath).Length / 1KB) }
}

if ($pending.Count -eq 0) {
    Write-Log "全部完成! 成功 $($completed.Count) | 失败 $($failed.Count)"
    exit 0
}

Write-Log "待处理: $($pending.Count) | 已完成: $($completed.Count) | 失败: $($failed.Count)"

$idx = 0
foreach ($item in $pending) {
    $idx++
    $name = $item.Name
    Write-Log "[$idx/$($pending.Count)] $name ($($item.SizeKB)KB)"
    
    $tempDir = Join-Path $outBase "_core_${name}_temp"
    if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue }
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
    
    $startTime = Get-Date
    try {
        $proc = Start-Process -FilePath $mineru -ArgumentList '-p', $item.Path, '-o', $tempDir, '-m', 'ocr' -NoNewWindow -Wait -PassThru
        $elapsed = [math]::Round(((Get-Date) - $startTime).TotalSeconds)
        
        if ($proc.ExitCode -eq 0) {
            $mdFiles = Get-ChildItem $tempDir -Recurse -Filter "*.md" -ErrorAction SilentlyContinue
            if ($mdFiles) {
                $processedDir = Join-Path $outBase "_processed_md"
                if (-not (Test-Path $processedDir)) { New-Item -ItemType Directory -Path $processedDir -Force | Out-Null }
                $finalMd = Join-Path $processedDir ($name -replace '\.pdf$', '.md')
                Copy-Item $mdFiles[0].FullName $finalMd -Force
                Write-Log "  OK ${elapsed}s -> $($finalMd)"
                $null = $completed.Add($name)
                $progress.completed = @($completed)
            } else {
                Write-Log "  WARN: 无 MD 输出 (elapsed=${elapsed}s)"
                $null = $failed.Add($name)
                $progress.failed = @($failed)
            }
        } else {
            Write-Log "  FAIL exit=$($proc.ExitCode) (elapsed=${elapsed}s)"
            $null = $failed.Add($name)
            $progress.failed = @($failed)
        }
    } catch {
        Write-Log "  ERROR: $_"
        $null = $failed.Add($name)
        $progress.failed = @($failed)
    }
    
    if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue }
    $progress | ConvertTo-Json -Depth 2 | Set-Content $progressFile
}

Write-Log "DONE! 成功 $($completed.Count) | 失败 $($failed.Count)"
