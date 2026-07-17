# 人生决策宗师 - 一键部署脚本 v2.0
# 参考 Alice 方法论：确认→备份→执行→验证四步法
# 部署目标: awkn.cn/life/ (阿里云 ECS 8.148.245.29)

$ErrorActionPreference = "Stop"
$script:StartTime = Get-Date

# ===== 配置 =====
$ServerIP = if ($env:DEPLOY_SERVER_IP) { $env:DEPLOY_SERVER_IP } else { "8.148.245.29" }
$SshKey = if ($env:DEPLOY_SSH_KEY) { $env:DEPLOY_SSH_KEY } else { "$env:USERPROFILE\.ssh\aliyun_awkn" }
$ProjectRoot = "C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife"
$FrontendDir = Join-Path $ProjectRoot "app"
$BackendDir = Join-Path $ProjectRoot "awkn-life-backend"
$RemoteRoot = "/opt/awkn-life"
$RemoteFrontendDir = "/www/wwwroot/awkn-lab/life"
$RemoteApiHealthPath = "/life/api/v1/health"
$DeployDir = Join-Path (Split-Path $ProjectRoot -Parent) ".deploy"
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$DeployArchive = Join-Path $DeployDir "awkn-life-$Timestamp.tgz"
$BackupTag = "deploy-$Timestamp"

function Write-Step([string]$step, [string]$message) {
    Write-Host "`n[$step] $message" -ForegroundColor Yellow
}

function Write-Ok([string]$message) {
    $elapsed = ((Get-Date) - $script:StartTime).TotalSeconds
    Write-Host "[+${elapsed}s] $message" -ForegroundColor Green
}

function Write-Error-Step([string]$message) {
    Write-Host "[-] ERROR: $message" -ForegroundColor Red
}

function Invoke-SshCommand([string]$command, [string]$description = "") {
    if ($description) { Write-Host "  -> $description" -ForegroundColor Gray }
    $fullCmd = "ssh -i `"$SshKey`" -o StrictHostKeyChecking=no -o ConnectTimeout=10 -o LogLevel=ERROR root@$ServerIP `"$command`""
    $output = & cmd /c $fullCmd 2>&1
    $exitCode = $LASTEXITCODE
    if ($exitCode -and $exitCode -ne 0) {
        Write-Error-Step "SSH command failed (exit=$exitCode)"
        return $false, ($output | Out-String)
    }
    return $true, ($output | Out-String)
}

function Invoke-ScpUpload([string]$localPath, [string]$remotePath) {
    Write-Host "  -> Upload: $localPath -> $remotePath" -ForegroundColor Gray
    scp -i $SshKey -o StrictHostKeyChecking=no -o ConnectTimeout=10 -o LogLevel=ERROR -r $localPath root@${ServerIP}:${remotePath}
    if ($LASTEXITCODE -ne 0) {
        Write-Error-Step "SCP upload failed"
        return $false
    }
    return $true
}

function Invoke-HealthCheck([string]$endpoint) {
    try {
        $response = Invoke-RestMethod -Uri $endpoint -TimeoutSec 10
        return $true, $response
    } catch {
        return $false, $_.Exception.Message
    }
}

function Invoke-BuildCommand([string]$workingDir, [string]$label) {
    $logFile = Join-Path $env:TEMP ("awkn-build-" + $label + "-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".log")
    $previousIgnore = $env:BROWSERSLIST_IGNORE_OLD_DATA
    $env:BROWSERSLIST_IGNORE_OLD_DATA = "1"

    Push-Location $workingDir
    try {
        # 用 cmd /c 包裹 npm，确保 $LASTEXITCODE 正确捕获 npm 退出码
        # 直接管道 npm.cmd（batch 文件）在 PowerShell 中 $LASTEXITCODE 捕获不可靠
        & cmd /c "npm run build 2>&1" | Tee-Object -FilePath $logFile | Out-Null
        $exitCode = $LASTEXITCODE
    } finally {
        Pop-Location
        if ($null -eq $previousIgnore) {
            Remove-Item Env:BROWSERSLIST_IGNORE_OLD_DATA -ErrorAction SilentlyContinue
        } else {
            $env:BROWSERSLIST_IGNORE_OLD_DATA = $previousIgnore
        }
    }

    # 用 Write-Host 输出日志，不污染函数返回值
    if (Test-Path $logFile) {
        $logContent = Get-Content -Path $logFile | Select-Object -Last 20
        Write-Host ($logContent | Out-String)
        Remove-Item $logFile -Force -ErrorAction SilentlyContinue
    }

    return $exitCode
}

# ===== 部署开始 =====
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  人生决策宗师 - 一键部署 v2.0" -ForegroundColor Cyan
Write-Host "  目标: $ServerIP" -ForegroundColor Cyan
Write-Host "  时间: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# ===== 第一步：确认（Alice 方法论：部署前3确认）=====
Write-Step "1/8" "部署前确认..."

# 确认1: SSH 连通性
$ok, $result = Invoke-SshCommand "echo 'SSH_OK' && uname -a" "SSH 连通性检查"
if (-not $ok) {
    Write-Error-Step "无法连接到服务器 $ServerIP，请检查 SSH Key 和网络"
    exit 1
}
Write-Ok "SSH 连通性正常"

# 确认2: 当前运行状态
$ok, $pm2Status = Invoke-SshCommand "pm2 jlist 2>/dev/null || echo 'NO_PM2'" "当前 PM2 状态"
$ok, $nginxStatus = Invoke-SshCommand "systemctl is-active nginx 2>/dev/null || echo 'unknown'" "Nginx 状态"
Write-Host "  PM2: $(if ($pm2Status -match 'awkn-life') { '运行中' } else { '未运行/无记录' })" -ForegroundColor Gray
Write-Host "  Nginx: $($nginxStatus.Trim())" -ForegroundColor Gray

# 确认3: 磁盘空间
$ok, $diskSpace = Invoke-SshCommand "df -h /opt | tail -1" "磁盘空间检查"
Write-Host "  磁盘: $($diskSpace.Trim())" -ForegroundColor Gray
Write-Ok "部署前确认完成"

# ===== 第二步：本地构建前端 =====
Write-Step "2/8" "本地构建前端..."
Set-Location $FrontendDir

$needBuild = $true
if ($env:SKIP_FRONTEND_BUILD -eq "1") {
    Write-Host "  SKIP_FRONTEND_BUILD=1, 跳过前端构建" -ForegroundColor Gray
    $needBuild = $false
}

if ($needBuild) {
    try {
        $buildExitCode = Invoke-BuildCommand -workingDir $FrontendDir -label "frontend"
        if ($buildExitCode -ne 0) { throw "前端构建失败 (exit=$buildExitCode)" }
        Write-Ok "前端构建成功 (dist/)"
    } catch {
        Write-Error-Step "前端构建失败: $_"
        exit 1
    }
} else {
    Write-Host "  使用已有 dist/" -ForegroundColor Gray
}

# ===== 第三步：本地构建后端 =====
Write-Step "3/8" "本地构建后端..."
Set-Location "$BackendDir\apps\api-server"

$needBackendBuild = $true
if ($env:SKIP_BACKEND_BUILD -eq "1") {
    Write-Host "  SKIP_BACKEND_BUILD=1, 跳过后端构建" -ForegroundColor Gray
    $needBackendBuild = $false
}

if ($needBackendBuild) {
    try {
        $buildExitCode = Invoke-BuildCommand -workingDir "$BackendDir\apps\api-server" -label "backend"
        if ($buildExitCode -ne 0) { throw "后端构建失败 (exit=$buildExitCode)" }
        Write-Ok "后端构建成功 (dist/)"
    } catch {
        Write-Error-Step "后端构建失败: $_"
        exit 1
    }
}
Set-Location $ProjectRoot

# ===== 第四步：打压上传 =====
Write-Step "4/8" "压缩打包..."
New-Item -ItemType Directory -Force -Path $DeployDir | Out-Null

$7z = "C:\Program Files\7-Zip\7z.exe"
if (Test-Path $7z) {
    $excludeArgs = @("-xr!node_modules", "-xr!.git", "-xr!.deploy", "-xr!*.tgz", "-xr!*.tar.gz", "-xr!frontend-dist", "-xr!backup")
    & $7z a -ttar "$DeployDir\awkn-life-$Timestamp.tar" "$ProjectRoot\*" $excludeArgs 2>&1 | Select-Object -Last 3
    & $7z a -tgzip "$DeployArchive" "$DeployDir\awkn-life-$Timestamp.tar" 2>&1 | Select-Object -Last 3
    Remove-Item "$DeployDir\awkn-life-$Timestamp.tar" -Force
} else {
    tar -czf $DeployArchive -C $ProjectRoot . --exclude='node_modules' --exclude='.git' --exclude='.deploy' --exclude='*.tgz' --exclude='*.tar.gz'
}
Write-Ok "打包完成 ($DeployArchive)"

Write-Step "5/8" "上传到服务器..."
$ok = Invoke-ScpUpload $DeployArchive "/tmp/awkn-life-deploy.tgz"
if (-not $ok) {
    Write-Error-Step "上传失败"
    exit 1
}
Write-Ok "上传完成"

# ===== 第五步：服务器端备份与部署（Alice 方法论：先备份再修改）=====
Write-Step "6/8" "服务器端部署..."

$serverDeployScript = @"
#!/bin/bash
set -e
echo "=== 服务器部署开始 ==="

RemoteRoot="$RemoteRoot"
RemoteFrontendDir="$RemoteFrontendDir"
Timestamp="$Timestamp"

# 备份当前运行版本
if [ -d "`${RemoteRoot}" ]; then
    echo "[备份] 当前版本 -> /opt/awkn-life-backup-`${Timestamp}"
    cp -r `${RemoteRoot} /opt/awkn-life-backup-`${Timestamp} 2>/dev/null || true
    echo "[备份] PM2 进程列表"
    pm2 save 2>/dev/null || true
fi

# 解压新版本
echo "[解压] 新版本代码"
rm -rf /opt/awkn-life-new
mkdir -p /opt/awkn-life-new
tar -xzf /tmp/awkn-life-deploy.tgz -C /opt/awkn-life-new/
rm -f /tmp/awkn-life-deploy.tgz

# 合并已有配置
if [ -f "`${RemoteRoot}/awkn-life-backend/apps/api-server/.env" ]; then
    echo "[配置] 保留现有 .env"
    cp `${RemoteRoot}/awkn-life-backend/apps/api-server/.env /opt/awkn-life-new/awkn-life-backend/apps/api-server/.env
fi

# 保留线上业务数据库，避免被仓库内测试库覆盖
if [ -f "`${RemoteRoot}/awkn-life-backend/apps/api-server/prisma/dev.db" ]; then
    echo "[数据库] 保留现有 apps/api-server/prisma/dev.db"
    mkdir -p /opt/awkn-life-new/awkn-life-backend/apps/api-server/prisma
    cp `${RemoteRoot}/awkn-life-backend/apps/api-server/prisma/dev.db /opt/awkn-life-new/awkn-life-backend/apps/api-server/prisma/dev.db
fi

if [ -f "`${RemoteRoot}/awkn-life-backend/apps/api-server/prisma/prod.db" ]; then
    echo "[数据库] 保留现有 apps/api-server/prisma/prod.db"
    mkdir -p /opt/awkn-life-new/awkn-life-backend/apps/api-server/prisma
    cp `${RemoteRoot}/awkn-life-backend/apps/api-server/prisma/prod.db /opt/awkn-life-new/awkn-life-backend/apps/api-server/prisma/prod.db
fi

# 原子切换
if [ -d "`${RemoteRoot}" ]; then
    rm -rf /opt/awkn-life-old
    mv `${RemoteRoot} /opt/awkn-life-old
fi
mv /opt/awkn-life-new `${RemoteRoot}

# 安装后端依赖
echo "[依赖] 安装后端依赖"
cd `${RemoteRoot}/awkn-life-backend
npm ci --legacy-peer-deps 2>&1 | tail -5

# 生成 Prisma Client
echo "[Prisma] 生成 Prisma Client"
cd `${RemoteRoot}/awkn-life-backend
npx prisma generate 2>&1 | tail -3

# 执行 Prisma 数据库迁移（本次变更: freeTrialUsed, parentReferralId, NamingResult）
echo "[Prisma] 执行数据库迁移"
cd `${RemoteRoot}/awkn-life-backend/apps/api-server
export DATABASE_URL="file:${RemoteRoot}/awkn-life-backend/apps/api-server/prisma/dev.db"
npx prisma migrate deploy 2>&1 | tail -10

# 重启 PM2（切回后端根目录）
cd `${RemoteRoot}/awkn-life-backend
pm2 delete awkn-life-backend 2>/dev/null || true
pm2 start `${RemoteRoot}/awkn-life-backend/ecosystem.config.js 2>&1 | tail -5
pm2 save

# 确保管理员账号 —— 从 api-server 目录运行，DATABASE_URL 用绝对路径
echo "[Admin] 确保管理员账号"
cd `${RemoteRoot}/awkn-life-backend/apps/api-server
export DATABASE_URL="file:${RemoteRoot}/awkn-life-backend/apps/api-server/prisma/dev.db"
ADMIN_EMAIL=10919669@qq.com ADMIN_PASSWORD=`${ADMIN_PASSWORD:-"79104003"} node scripts/ensure-admin.js 2>&1 || echo "[Admin] ensure-admin 执行失败，请手动检查"

# 前端静态文件部署
if [ -d "`${RemoteRoot}/app/dist" ]; then
    echo "[前端] 部署静态文件到 `${RemoteFrontendDir}"
    mkdir -p `${RemoteFrontendDir}
    rm -rf `${RemoteFrontendDir}/*
    cp -r `${RemoteRoot}/app/dist/* `${RemoteFrontendDir}/
    chmod -R a+rX `${RemoteFrontendDir}
    echo "[前端] 权限已修复 (a+rX)"
fi

# Nginx 重载
echo "[Nginx] 重载配置"
if nginx -t 2>/dev/null; then
    systemctl reload nginx
    echo "[Nginx] 重载成功"
else
    echo "[Nginx] 配置测试失败, 跳过重载"
fi

echo "=== 服务器部署完成 ==="
"@

$deployScriptPath = Join-Path $DeployDir "server-deploy-$Timestamp.sh"
$serverDeployScriptLf = $serverDeployScript -replace "`r`n", "`n"
[System.IO.File]::WriteAllText($deployScriptPath, $serverDeployScriptLf, [System.Text.UTF8Encoding]::new($false))
$ok = Invoke-ScpUpload $deployScriptPath "/tmp/server-deploy.sh"
if (-not $ok) {
    Write-Error-Step "上传部署脚本失败"
    exit 1
}
$ok, $result = Invoke-SshCommand "bash /tmp/server-deploy.sh" "执行服务器部署"
if (-not $ok) {
    Write-Error-Step "服务器部署失败"
    Write-Host "  回滚方案: 恢复备份 /opt/awkn-life-backup-$Timestamp" -ForegroundColor Yellow
    exit 1
}
Write-Ok "服务器部署完成"

# ===== 第六步：权限修复 =====
Write-Step "7/8" "文件权限修复..."

$fixPermScript = @"
RemoteFrontendDir="$RemoteFrontendDir"
RemoteRoot="$RemoteRoot"

# 前端静态文件权限
if [ -d "`${RemoteFrontendDir}" ]; then
    chmod -R a+rX `${RemoteFrontendDir}
    echo "[权限] 前端目录已修复"
fi

# 后端日志目录
mkdir -p `${RemoteRoot}/logs
chmod -R 755 `${RemoteRoot}/logs

# PM2 确保开机启动
pm2 startup systemd -u root --hp /root 2>/dev/null || true
pm2 save
"@

$fixPermScriptPath = Join-Path $DeployDir "fix-perm-$Timestamp.sh"
$fixPermScriptLf = $fixPermScript -replace "`r`n", "`n"
[System.IO.File]::WriteAllText($fixPermScriptPath, $fixPermScriptLf, [System.Text.UTF8Encoding]::new($false))
Invoke-ScpUpload $fixPermScriptPath "/tmp/fix-perm.sh" | Out-Null
Invoke-SshCommand "bash /tmp/fix-perm.sh" "权限修复" | Out-Null
Write-Ok "权限修复完成"

# ===== 第七步：结构化健康检查（Alice 方法论：可观测性）=====
Write-Step "8/8" "结构化健康检查..."

Start-Sleep -Seconds 5
$healthResults = @()

# 检查1: 后端进程（3000/3002 任一监听即可，最终以健康接口为准）
$ok, $portResult = Invoke-SshCommand "ss -tlnp | grep -E ':3002|:3000' || true" "后端监听端口检查"
$healthResults += @{
    Name = "后端端口"
    Status = if ($ok -and ($portResult -match '3002' -or $portResult -match '3000')) { "PASS" } else { "FAIL" }
    Detail = if ($ok -and $portResult.Trim()) { $portResult.Trim() } else { "未发现 3000/3002 监听" }
}

# 检查2: 根站点首页仍可达（防误伤 awkn.cn）
$ok, $rootResp = Invoke-HealthCheck "https://awkn.cn/"
$healthResults += @{
    Name = "根站 awkn.cn/"
    Status = if ($ok) { "PASS" } else { "FAIL" }
    Detail = if ($ok) { "HTTP 200" } else { $rootResp }
}

# 检查3: 前端首页 (HTTPS)
$ok, $resp = Invoke-HealthCheck "https://awkn.cn/life/"
$healthResults += @{
    Name = "前端 /life/"
    Status = if ($ok) { "PASS" } else { "FAIL" }
    Detail = if ($ok) { "HTTP 200" } else { $resp }
}

# 检查4: API 健康接口（公网真实入口）
$ok, $apiResp = Invoke-HealthCheck ("https://awkn.cn" + $RemoteApiHealthPath)
$healthResults += @{
    Name = "API $RemoteApiHealthPath"
    Status = if ($ok) { "PASS" } else { "FAIL" }
    Detail = if ($ok) { ($apiResp | ConvertTo-Json -Compress) } else { $apiResp }
}

# 检查5: 前端 JS 资源 MIME 类型
try {
    $pageContent = Invoke-RestMethod -Uri "https://awkn.cn/life/" -TimeoutSec 10
    if ($pageContent -match 'src="(/life/assets/[^"]+\.js)"') {
        $jsPath = $Matches[1]
        $response = Invoke-WebRequest -Uri "https://awkn.cn${jsPath}" -TimeoutSec 10
        $contentType = $response.Headers['Content-Type']
        $healthResults += @{
            Name = "JS MIME ($jsPath)"
            Status = if ($contentType -match 'javascript') { "PASS" } else { "FAIL" }
            Detail = "Content-Type: $contentType"
        }
    }
} catch {
    $healthResults += @{
        Name = "JS MIME 检查"
        Status = "SKIP"
        Detail = $_.Exception.Message
    }
}

# 输出健康检查报告
Write-Host "`n  结构健康检查报告:" -ForegroundColor Cyan
Write-Host "  --------------------------------------------------" -ForegroundColor Gray
foreach ($r in $healthResults) {
    $color = switch ($r.Status) {
        "PASS" { "Green" }
        "FAIL" { "Red" }
        "SKIP" { "Yellow" }
        default { "Gray" }
    }
    Write-Host "  [$($r.Status)] $($r.Name)" -ForegroundColor $color
    Write-Host "          $($r.Detail)" -ForegroundColor Gray
}
Write-Host "  --------------------------------------------------" -ForegroundColor Gray

$failCount = ($healthResults | Where-Object { $_.Status -eq "FAIL" }).Count
$passCount = ($healthResults | Where-Object { $_.Status -eq "PASS" }).Count

# ===== 完成 =====
$totalTime = ((Get-Date) - $script:StartTime).TotalSeconds
Write-Host "`n=============================================" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Yellow" })
Write-Host "  部署完成!  耗时: ${totalTime}s" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Yellow" })
Write-Host "  PASS: $passCount  FAIL: $failCount" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Yellow" })
Write-Host "  访问: https://awkn.cn/life/" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Yellow" })

if ($failCount -gt 0) {
    Write-Host "`n  回滚命令:" -ForegroundColor Yellow
    Write-Host "  ssh -i $SshKey root@$ServerIP 'rm -rf $RemoteRoot && mv /opt/awkn-life-backup-$Timestamp $RemoteRoot && pm2 start $RemoteRoot/awkn-life-backend/ecosystem.config.js && pm2 save && systemctl reload nginx'" -ForegroundColor Gray
}

exit 0
