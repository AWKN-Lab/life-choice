$docsPath = 'C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs'
$files = Get-ChildItem -Path $docsPath -Recurse -Filter '*.md'
$total = $files.Count
$stale = @($files | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) })
$recent = @($files | Where-Object { $_.LastWriteTime -ge (Get-Date).AddDays(-7) })
$midAge = @($files | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) -and $_.LastWriteTime -ge (Get-Date).AddDays(-30) })

Write-Output "=== 文档新鲜度统计 ==="
Write-Output "总计: $total 个 .md 文件"
Write-Output "近7天: $($recent.Count) 个"
Write-Output "7-30天: $($midAge.Count) 个"
Write-Output "STALE(>30天): $($stale.Count) 个"
Write-Output ""
Write-Output "=== STALE 文档 Top 20（按修改时间升序）==="
$stale | Sort-Object LastWriteTime | Select-Object -First 20 | ForEach-Object {
    $rel = $_.FullName.Replace($docsPath + '\', '')
    Write-Output "$($_.LastWriteTime.ToString('yyyy-MM-dd'))  $rel"
}
Write-Output ""
Write-Output "=== 最新文档 Top 15（按修改时间降序）==="
$files | Sort-Object LastWriteTime -Descending | Select-Object -First 15 | ForEach-Object {
    $rel = $_.FullName.Replace($docsPath + '\', '')
    Write-Output "$($_.LastWriteTime.ToString('yyyy-MM-dd HH:mm'))  $rel"
}
