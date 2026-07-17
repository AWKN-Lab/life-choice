# P4-1-A 纯 bg-white -> bg-surface-container 批量替换脚本
# 仅替换纯 bg-white（不带斜杠），不处理 bg-white/N（P3-5 已完成）
# 排除需手动处理的文件：ResultChat.tsx/ConclusionPreview.tsx/MultiEndingDisplay.tsx
# 排除目录：_archived/、ui/、海报组件

$ErrorActionPreference = 'Stop'
$srcPath = 'c:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife\app\src'

$skipFiles = @(
    'PosterGenerator.tsx',
    'KLineImageGenerator.tsx',
    'KLineShareCard.tsx',
    'KlineShareCard.tsx',
    'ResultChat.tsx',
    'ConclusionPreview.tsx',
    'MultiEndingDisplay.tsx'
)
$skipDirs = @('_archived', 'ui')

$files = Get-ChildItem -Path $srcPath -Recurse -Filter '*.tsx' -File |
    Where-Object {
        $rel = $_.FullName.Substring($srcPath.Length)
        $skip = $false
        foreach ($d in $skipDirs) {
            if ($rel -like "*\$d\*" -or $rel -like "*\$d/*") { $skip = $true; break }
        }
        if ($skipFiles -contains $_.Name) { $skip = $true }
        return -not $skip
    }

$totalReplacements = 0
$modifiedFiles = 0

$pattern = 'bg-white(?![/\w])'
$replacement = 'bg-surface-container'

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
    $original = $content

    $matches = [regex]::Matches($content, $pattern)
    if ($matches.Count -gt 0) {
        $content = [regex]::Replace($content, $pattern, $replacement)
        $utf8NoBom = New-Object System.Text.UTF8Encoding $false
        [System.IO.File]::WriteAllText($file.FullName, $content, $utf8NoBom)
        $totalReplacements += $matches.Count
        $modifiedFiles++
        Write-Host ("  {0}: {1} 处替换" -f $file.Name, $matches.Count)
    }
}

Write-Host ""
Write-Host "===== P4-1-A 批量替换完成 ====="
Write-Host ("修改文件数: {0}" -f $modifiedFiles)
Write-Host ("总替换数:   {0}" -f $totalReplacements)
