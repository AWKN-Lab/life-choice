# P3-5 text-white/bg-white -> token 批量替换脚本
# 安全替换规则（仅半透明叠加层和主文本色）：
#   text-white       -> text-on-surface
#   text-white/N     -> text-on-surface/N
#   text-white/[N]   -> text-on-surface/[N]
#   bg-white/N       -> bg-on-surface/N
#   bg-white/[N]     -> bg-on-surface/[N]
#   border-white/N   -> border-outline/N
#   border-white/[N] -> border-outline/[N]
# 不替换：纯 bg-white（无斜杠）、bg-white dark: 模式
# 跳过目录/文件：_archived/、PosterGenerator.tsx、KLineImageGenerator.tsx、KLineShareCard.tsx、ui/

$ErrorActionPreference = 'Stop'
$srcPath = 'c:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife\app\src'

# 收集所有 .tsx 文件（排除跳过项）
$skipFiles = @(
    'PosterGenerator.tsx',
    'KLineImageGenerator.tsx',
    'KLineShareCard.tsx'
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

# 替换规则（顺序重要：先替换带斜杠的，再替换纯 text-white）
$rules = @(
    # bg-white/[N] 方括号语法（必须先于 bg-white/N）
    @{ Pattern = 'bg-white/\[([^\]]+)\]'; Replacement = 'bg-on-surface/[$1]' }
    # bg-white/N 斜杠语法
    @{ Pattern = 'bg-white/(\d+)'; Replacement = 'bg-on-surface/$1' }
    # border-white/[N]
    @{ Pattern = 'border-white/\[([^\]]+)\]'; Replacement = 'border-outline/[$1]' }
    # border-white/N
    @{ Pattern = 'border-white/(\d+)'; Replacement = 'border-outline/$1' }
    # text-white/[N]
    @{ Pattern = 'text-white/\[([^\]]+)\]'; Replacement = 'text-on-surface/[$1]' }
    # text-white/N
    @{ Pattern = 'text-white/(\d+)'; Replacement = 'text-on-surface/$1' }
    # 纯 text-white（最后替换，避免误伤 text-white/N）
    # 使用负向断言：text-white 后面不能是 / 或字母数字
    @{ Pattern = 'text-white(?![/\w])'; Replacement = 'text-on-surface' }
)

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
    $original = $content
    $fileReplacements = 0

    foreach ($rule in $rules) {
        $matches = [regex]::Matches($content, $rule.Pattern)
        if ($matches.Count -gt 0) {
            $content = [regex]::Replace($content, $rule.Pattern, $rule.Replacement)
            $fileReplacements += $matches.Count
        }
    }

    if ($content -ne $original) {
        # 不带 BOM 写入 UTF8
        $utf8NoBom = New-Object System.Text.UTF8Encoding $false
        [System.IO.File]::WriteAllText($file.FullName, $content, $utf8NoBom)
        $totalReplacements += $fileReplacements
        $modifiedFiles++
        Write-Host ("  {0}: {1} 处替换" -f $file.Name, $fileReplacements)
    }
}

Write-Host ""
Write-Host "===== P3-5 批量替换完成 ====="
Write-Host ("修改文件数: {0}" -f $modifiedFiles)
Write-Host ("总替换数:   {0}" -f $totalReplacements)
