$ErrorActionPreference = 'Stop'
$srcPath = 'c:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife\app\src'
$skipFiles = @('PosterGenerator.tsx','KLineImageGenerator.tsx','KLineShareCard.tsx','KlineShareCard.tsx','ResultChat.tsx','ConclusionPreview.tsx','MultiEndingDisplay.tsx')
$skipDirs = @('_archived','ui')
$files = Get-ChildItem -Path $srcPath -Recurse -Filter '*.tsx' -File | Where-Object { $rel = $_.FullName.Substring($srcPath.Length); $skip = $false; foreach ($d in $skipDirs) { if ($rel -like "*$d*" -or $rel -like "*$d/*") { $skip = $true; break } }; if ($skipFiles -contains $_.Name) { $skip = $true }; return -not $skip }
$total = 0; $mod = 0
foreach ($file in $files) { $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8; $matches = [regex]::Matches($content, 'bg-white(?![/\w])'); if ($matches.Count -gt 0) { $content = [regex]::Replace($content, 'bg-white(?![/\w])', 'bg-surface-container'); $utf8NoBom = New-Object System.Text.UTF8Encoding $false; [System.IO.File]::WriteAllText($file.FullName, $content, $utf8NoBom); $total += $matches.Count; $mod++; Write-Host ("  {0}: {1}" -f $file.Name, $matches.Count) } }
Write-Host ''; Write-Host ('===== P4-1A done: files=' + $mod + ' replacements=' + $total)
