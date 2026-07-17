# 修复 awkn.cn/life 静态资源 403

$ErrorActionPreference = "Stop"

$ServerIP = if ($env:DEPLOY_SERVER_IP) { $env:DEPLOY_SERVER_IP } else { "8.148.245.29" }
$SshKey = if ($env:DEPLOY_SSH_KEY) { $env:DEPLOY_SSH_KEY } else { "$env:USERPROFILE\.ssh\aliyun_awkn" }
$RemoteFrontendDir = "/www/wwwroot/awkn-lab/life"

Write-Host "=== 修复 /life/assets 403 ===" -ForegroundColor Cyan
Write-Host "目标服务器: $ServerIP" -ForegroundColor Cyan

$remote = @"
set -e
echo '[检查] 当前权限'
stat -c '%A %U:%G %n' $RemoteFrontendDir $RemoteFrontendDir/assets || true

echo '[修复] 目录/文件权限'
chown -R www:www $RemoteFrontendDir
find $RemoteFrontendDir -type d -exec chmod 755 {} \;
find $RemoteFrontendDir -type f -exec chmod 644 {} \;

echo '[验证] 修复后权限'
stat -c '%A %U:%G %n' $RemoteFrontendDir $RemoteFrontendDir/assets
ls -l $RemoteFrontendDir/assets | sed -n '1,10p'

echo '[重载] nginx'
nginx -t
systemctl reload nginx
"@

ssh -i $SshKey -o StrictHostKeyChecking=no -o ConnectTimeout=10 root@$ServerIP $remote
if ($LASTEXITCODE -ne 0) {
  throw "服务器修复命令执行失败"
}

Write-Host "=== 修复完成 ===" -ForegroundColor Green
