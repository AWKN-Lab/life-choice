# apply-skill-updates.ps1
# 应用部署技能更新（E-A23~E-A25 + project-天火Life.md 修正）
# 使用方法：在PowerShell中运行 .\apply-skill-updates.ps1
# 日期：2026-07-03

$ErrorActionPreference = "Stop"

$skillDir = "C:\Users\10919\.agents\skills\awkn-部署\references"
$updateDir = "c:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\engineering"
$ts = "20260703"

Write-Host "=== 部署技能更新脚本 ===" -ForegroundColor Cyan
Write-Host ""

# ========== 1. 备份原文件 ==========
Write-Host "[1/4] 备份原文件..." -ForegroundColor Yellow
@("experience-entries.md", "project-天火Life.md") | ForEach-Object {
    $src = Join-Path $skillDir $_
    $bak = "$src.bak-$ts"
    if (-not (Test-Path $bak)) {
        Copy-Item -Path $src -Destination $bak -Force
        Write-Host "  ✅ 备份: $bak"
    } else {
        Write-Host "  ⏭️ 已存在备份: $bak"
    }
}

# ========== 2. 追加 E-A23~E-A25 到 experience-entries.md ==========
Write-Host ""
Write-Host "[2/4] 追加 E-A23~E-A25 到 experience-entries.md..." -ForegroundColor Yellow

$origExp = Join-Path $skillDir "experience-entries.md"
$tmpExp = Join-Path $updateDir "临时-E-A23-25.md"

$origContent = Get-Content -Path $origExp -Raw -Encoding UTF8
$insertContent = Get-Content -Path $tmpExp -Raw -Encoding UTF8
$marker = "## 其他经验条目索引"

if ($origContent -match [regex]::Escape($marker)) {
    $replacement = $insertContent + $marker
    $newContent = $origContent -replace [regex]::Escape($marker), $replacement
    Set-Content -Path $origExp -Value $newContent -Encoding UTF8 -NoNewline
    Write-Host "  ✅ E-A23~E-A25 已追加"
} else {
    Write-Host "  ❌ 未找到插入点 '$marker'" -ForegroundColor Red
    Write-Host "  请检查 experience-entries.md 格式"
    exit 1
}

# ========== 3. 覆盖 project-天火Life.md ==========
Write-Host ""
Write-Host "[3/4] 更新 project-天火Life.md..." -ForegroundColor Yellow

$origProj = Join-Path $skillDir "project-天火Life.md"
$newProj = Join-Path $updateDir "skill-updates\project-天火Life.md"

$newProjContent = Get-Content -Path $newProj -Raw -Encoding UTF8
Set-Content -Path $origProj -Value $newProjContent -Encoding UTF8 -NoNewline
Write-Host "  ✅ project-天火Life.md 已更新（端口3002→30000、目录awkn-lab→awkn.cn、备份策略E-A24）"

# ========== 4. 验证 ==========
Write-Host ""
Write-Host "[4/4] 验证更新..." -ForegroundColor Yellow

# 验证 E-A23~E-A25
$expContent = Get-Content -Path $origExp -Raw -Encoding UTF8
$hasEA23 = $expContent -match "E-A23"
$hasEA24 = $expContent -match "E-A24"
$hasEA25 = $expContent -match "E-A25"
Write-Host "  E-A23 存在: $hasEA23"
Write-Host "  E-A24 存在: $hasEA24"
Write-Host "  E-A25 存在: $hasEA25"

# 验证 project-天火Life.md
$projContent = Get-Content -Path $origProj -Raw -Encoding UTF8
$has30000 = $projContent -match "30000"
$hasAwknCn = $projContent -match "awkn\.cn"
$hasDistOld = $projContent -match "dist\.old"
Write-Host "  端口30000: $has30000"
Write-Host "  目录awkn.cn: $hasAwknCn"
Write-Host "  dist.old策略: $hasDistOld"

Write-Host ""
Write-Host "=== 更新完成 ===" -ForegroundColor Green
Write-Host ""
Write-Host "如需回滚，运行："
Write-Host "  Copy-Item `"$skillDir\experience-entries.md.bak-$ts`" `"$skillDir\experience-entries.md`" -Force"
Write-Host "  Copy-Item `"$skillDir\project-天火Life.md.bak-$ts`" `"$skillDir\project-天火Life.md`" -Force"
