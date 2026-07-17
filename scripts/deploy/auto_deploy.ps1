# 人生决策宗师 - 自动部署脚本
# 部署到阿里云 ECS (8.148.245.29)

$ErrorActionPreference = "Stop"
$serverIP = $env:DEPLOY_SERVER_IP
if (-not $serverIP) { throw "DEPLOY_SERVER_IP environment variable is required" }
$sshKey = $env:DEPLOY_SSH_KEY ?? "$env:USERPROFILE\.ssh\aliyun_awkn"
$projectDir = "C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife"
$remoteDir = "/opt/awkn-life"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  人生决策宗师 - 自动部署" -ForegroundColor Cyan
Write-Host "  目标服务器: $serverIP" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# 步骤1: 本地构建
Write-Host "`n[1/5] 本地构建后端..." -ForegroundColor Yellow
Set-Location $projectDir\awkn-life-backend
try {
    npm run build 2>&1 | Select-Object -Last 20
    if ($LASTEXITCODE -ne 0) { throw "构建失败" }
    Write-Host "✅ 本地构建成功" -ForegroundColor Green
} catch {
    Write-Host "❌ 构建失败: $_" -ForegroundColor Red
    exit 1
}

# 步骤2: 压缩项目
Write-Host "`n[2/5] 压缩项目文件..." -ForegroundColor Yellow
Set-Location "C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师"
$excludePatterns = @("node_modules", ".git", "dist", "*.tar.gz", ".deploy")
$tempExcludeFile = [System.IO.Path]::GetTempFileName()
$excludePatterns | Out-File -FilePath $tempExcludeFile -Encoding UTF8

try {
    # 使用 7z 压缩（如果可用）
    $7zPath = "C:\Program Files\7-Zip\7z.exe"
    if (Test-Path $7zPath) {
        & $7zPath a -tgz awkn-life-deploy.tar.gz "apps\AWKN-LABlife\" -xr!node_modules -xr!.git -xr!dist -xr!*.tar.gz -xr!.deploy 2>&1 | Select-Object -Last 5
    } else {
        # 使用 PowerShell 压缩
        Compress-Archive -Path "$projectDir\*" -DestinationPath "awkn-life-deploy.zip" -Force
    }
    Write-Host "✅ 压缩完成" -ForegroundColor Green
} catch {
    Write-Host "⚠️ 压缩警告: $_" -ForegroundColor Yellow
}

# 步骤3: 上传到服务器
Write-Host "`n[3/5] 上传代码到服务器..." -ForegroundColor Yellow
try {
    # 检查 SSH key
    if (-not (Test-Path $sshKey)) {
        Write-Host "❌ SSH key 不存在: $sshKey" -ForegroundColor Red
        exit 1
    }

    # 使用 scp 上传
    if (Test-Path "awkn-life-deploy.tar.gz") {
        scp -i $sshKey -o StrictHostKeyChecking=no awkn-life-deploy.tar.gz root@${serverIP}:/tmp/
    } else {
        scp -i $sshKey -o StrictHostKeyChecking=no awkn-life-deploy.zip root@${serverIP}:/tmp/
    }
    Write-Host "✅ 上传完成" -ForegroundColor Green
} catch {
    Write-Host "❌ 上传失败: $_" -ForegroundColor Red
    exit 1
}

# 步骤4: 服务器部署
Write-Host "`n[4/5] 服务器端部署..." -ForegroundColor Yellow
$deployScript = @"
set -e
echo "=== 服务器部署开始 ==="

# 解压代码
cd /tmp
if [ -f awkn-life-deploy.tar.gz ]; then
    tar -xzf awkn-life-deploy.tar.gz -C /opt/
    rm awkn-life-deploy.tar.gz
elif [ -f awkn-life-deploy.zip ]; then
    unzip -q awkn-life-deploy.zip -d /opt/
    rm awkn-life-deploy.zip
fi

# 进入项目目录
cd $remoteDir

# 安装依赖
echo "安装后端依赖..."
cd awkn-life-backend
npm ci --legacy-peer-deps 2>&1 | tail -5

# 生成 Prisma
cd apps/api-server
echo "生成 Prisma Client..."
npx prisma generate 2>&1 | tail -3

# 确保 .env 存在
if [ ! -f .env ]; then
    echo "⚠️  .env 不存在，从 example 复制"
    cp .env.example .env
fi

# 使用 PM2 重启
echo "重启 PM2 服务..."
pm2 delete awkn-life-backend 2>/dev/null || true
pm2 start $remoteDir/ecosystem.config.js --env production 2>&1 | tail -10

pm2 save

echo "=== 部署完成 ==="
"@

try {
    $deployScript | ssh -i $sshKey -o StrictHostKeyChecking=no root@$serverIP "bash -s"
    Write-Host "✅ 服务器部署完成" -ForegroundColor Green
} catch {
    Write-Host "❌ 服务器部署失败: $_" -ForegroundColor Red
    exit 1
}

# 步骤5: 健康检查
Write-Host "`n[5/5] 健康检查..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
try {
    $response = Invoke-RestMethod -Uri "http://${serverIP}:3000/health" -TimeoutSec 10
    if ($response.status -eq "ok") {
        Write-Host "✅ 服务健康检查通过" -ForegroundColor Green
    } else {
        Write-Host "⚠️  健康检查异常: $($response | ConvertTo-Json)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  健康检查失败: $_" -ForegroundColor Yellow
    Write-Host "   服务可能正在启动中，请稍后手动检查" -ForegroundColor Yellow
}

Write-Host "`n======================================" -ForegroundColor Green
Write-Host "  部署完成!" -ForegroundColor Green
Write-Host "  访问: http://$serverIP" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
