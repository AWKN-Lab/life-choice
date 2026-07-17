
# ==========================================
# 前端快速部署脚本 - Windows PowerShell
# ==========================================

Write-Host "======================================" -ForegroundColor Green
Write-Host "  人生决策宗师 - 前端部署" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green

# 配置
$ProjectDir = "C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\AWKN-LABlife"
$DistDir = "$ProjectDir\app\dist"
$DeployDir = "$ProjectDir\.deploy"
$SshKey = "C:\Users\10919\.ssh\aliyun_awkn"
$Server = "root@8.148.245.29"
$RemoteDir = "/opt/awkn-life"

# 时间戳
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$ZipFile = "$DeployDir\life-frontend-$Timestamp.zip"

# 步骤 1: 打包
Write-Host ""
Write-Host "📦 打包构建产物..." -ForegroundColor Yellow
if (-not (Test-Path $DeployDir)) {
    New-Item -ItemType Directory -Path $DeployDir | Out-Null
}
Compress-Archive -Path "$DistDir\*" -DestinationPath $ZipFile -Force
Write-Host "✅ 已打包: $ZipFile" -ForegroundColor Green

# 步骤 2: 上传
Write-Host ""
Write-Host "🚀 上传到服务器..." -ForegroundColor Yellow
Write-Host "执行命令: scp -i `"$SshKey`" `"$ZipFile`" $Server:$RemoteDir/"
Write-Host ""
Write-Host "请在终端中执行上面的 scp 命令上传文件。" -ForegroundColor Cyan
Write-Host ""
Write-Host "上传完成后，在服务器上执行以下命令部署:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  cd $RemoteDir"
Write-Host "  cp -r /usr/share/nginx/html /usr/share/nginx/html.bak.`$(date +%Y%m%d_%H%M%S)"
Write-Host "  unzip -o life-frontend-$Timestamp.zip -d /usr/share/nginx/html/"
Write-Host "  ls -la /usr/share/nginx/html/assets/"
Write-Host "  find /usr/share/nginx/html -type d -exec chmod 755 {} \\;"
Write-Host "  find /usr/share/nginx/html -type f -exec chmod 644 {} \\;"
Write-Host "  nginx -t && systemctl reload nginx"
Write-Host ""
Write-Host "或者使用一键部署脚本: cd $RemoteDir && ./deploy.sh (选择模式 2)" -ForegroundColor Cyan
Write-Host ""
