param(
    [switch]$Strict
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$backendRoot = Join-Path $root 'apps\AWKN-LABlife\awkn-life-backend'
$apiRoot = Join-Path $backendRoot 'apps\api-server'

$results = [System.Collections.Generic.List[object]]::new()

function Add-Result(
    [string]$Area,
    [string]$Level,
    [string]$Check,
    [string]$Evidence,
    [string]$Action
) {
    $results.Add([pscustomobject]@{
        Area = $Area
        Level = $Level
        Check = $Check
        Evidence = $Evidence
        Action = $Action
    })
}

function Read-JsonFile([string]$path) {
    if (-not (Test-Path -LiteralPath $path)) { return $null }
    return Get-Content -LiteralPath $path -Raw -Encoding UTF8 | ConvertFrom-Json
}

function Test-TextContains([string]$path, [string]$pattern) {
    if (-not (Test-Path -LiteralPath $path)) { return $false }
    return [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8).Contains($pattern)
}

function Get-TextMatchCount([string]$path, [string]$pattern) {
    if (-not (Test-Path -LiteralPath $path)) { return 0 }
    $content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
    return [regex]::Matches($content, $pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase).Count
}

Write-Host ''
Write-Host '人生决策宗师｜后端工程边界审计' -ForegroundColor Cyan
Write-Host ('Root: {0}' -f $root)
Write-Host ('Time: {0:yyyy-MM-dd HH:mm:ss}' -f (Get-Date))
Write-Host ''

# 1. 包管理器与锁文件
$rootPackage = Read-JsonFile (Join-Path $backendRoot 'package.json')
$apiPackage = Read-JsonFile (Join-Path $apiRoot 'package.json')
$rootNpmLock = Test-Path -LiteralPath (Join-Path $backendRoot 'package-lock.json')
$apiNpmLock = Test-Path -LiteralPath (Join-Path $apiRoot 'package-lock.json')
$rootYarnLock = Test-Path -LiteralPath (Join-Path $backendRoot 'yarn.lock')
$rootPnpmLock = Test-Path -LiteralPath (Join-Path $backendRoot 'pnpm-lock.yaml')
$apiPnpmLock = Test-Path -LiteralPath (Join-Path $apiRoot 'pnpm-lock.yaml')

$lockEvidence = @(
    "root package-lock=$rootNpmLock",
    "api package-lock=$apiNpmLock",
    "root yarn.lock=$rootYarnLock",
    "root pnpm-lock=$rootPnpmLock",
    "api pnpm-lock=$apiPnpmLock"
) -join '; '

$lockFamilies = 0
if ($rootNpmLock -or $apiNpmLock) { $lockFamilies += 1 }
if ($rootYarnLock) { $lockFamilies += 1 }
if ($rootPnpmLock -or $apiPnpmLock) { $lockFamilies += 1 }

if ($lockFamilies -gt 1) {
    Add-Result '包管理' 'BLOCK' '多种锁文件并存' $lockEvidence '确定唯一生产包管理器与安装目录，在干净分支重新生成唯一锁文件。'
} else {
    Add-Result '包管理' 'PASS' '锁文件家族唯一' $lockEvidence '保持生产安装命令与锁文件一致。'
}

$deployPath = Join-Path $root 'apps\AWKN-LABlife\DEPLOY.md'
$backendReadmePath = Join-Path $backendRoot 'README.md'
$deployUsesNpm = (Get-TextMatchCount $deployPath '\bnpm\s+(ci|install)\b') -gt 0
$readmeUsesPnpm = (Get-TextMatchCount $backendReadmePath '\bpnpm\s+install\b') -gt 0
$readmeUsesYarn = (Get-TextMatchCount $backendReadmePath '\byarn\s+(install)?\b') -gt 0

if ($deployUsesNpm -and ($readmeUsesPnpm -or $readmeUsesYarn)) {
    Add-Result '包管理' 'WARN' '安装文档口径冲突' "DEPLOY=npm; backend README pnpm=$readmeUsesPnpm yarn=$readmeUsesYarn" '建立包管理器 ADR，并统一 README、部署文档和 packageManager 字段。'
} else {
    Add-Result '包管理' 'PASS' '安装文档口径一致' "DEPLOY npm=$deployUsesNpm; README pnpm=$readmeUsesPnpm yarn=$readmeUsesYarn" '继续保持文档与生产命令一致。'
}

if ($null -eq $rootPackage.packageManager -and $null -eq $apiPackage.packageManager) {
    Add-Result '包管理' 'WARN' '未声明 packageManager' 'backend root 与 api-server 均未声明 packageManager' '决策完成后在权威 package.json 声明 packageManager。'
} else {
    Add-Result '包管理' 'PASS' '已声明 packageManager' "root=$($rootPackage.packageManager); api=$($apiPackage.packageManager)" '保持 CI 与本地工具版本一致。'
}

# 2. 构建链
$rootBuild = [string]$rootPackage.scripts.build
$apiBuild = [string]$apiPackage.scripts.build
$apiBuildHasCopy = $apiBuild -match 'copy-assets\.js'
$apiBuildHasVerify = $apiBuild -match 'verify-build\.js'
$rootBuildDelegatesApi = $rootBuild -match 'npm\s+(-+prefix|--prefix)|npm\s+run\s+build\s+--workspace|cd\s+apps/api-server'
$rootBuildHasCopy = $rootBuild -match 'copy-assets\.js'
$rootBuildHasVerify = $rootBuild -match 'verify-build\.js'

if (-not ($apiBuildHasCopy -and $apiBuildHasVerify)) {
    Add-Result '构建链' 'BLOCK' 'API 构建缺少资产复制或校验' "api build=$apiBuild" '恢复 copy-assets.js 与 verify-build.js，使用空 dist 验证。'
} else {
    Add-Result '构建链' 'PASS' 'API 构建包含资产复制与校验' "api build=$apiBuild" '保持 API build 为单一完整构建入口。'
}

if ($rootBuildDelegatesApi -and -not ($rootBuildHasCopy -and $rootBuildHasVerify)) {
    Add-Result '构建链' 'WARN' '根构建可能绕过 API 完整构建脚本' "root build=$rootBuild" '根构建直接调用 api-server 的 npm run build，避免复制两套构建命令。'
} elseif ($rootBuildHasCopy -and $rootBuildHasVerify) {
    Add-Result '构建链' 'PASS' '根构建包含完整资产链' "root build=$rootBuild" '后续可收口为调用 API build，减少重复。'
} else {
    Add-Result '构建链' 'BLOCK' '根构建未覆盖完整资产链' "root build=$rootBuild" '改为 npm --prefix apps/api-server run build 或恢复复制与验证。'
}

# 3. 资产清单
$manifestPath = Join-Path $apiRoot 'assets-manifest.json'
$manifest = Read-JsonFile $manifestPath
$bindingRelative = 'consult/orchestrator/evidence-composer/knowledge-retriever/rule-knowledge-bindings.json'
$bindingSource = Join-Path $apiRoot ('src\' + $bindingRelative.Replace('/', '\'))
$bindingConsumer = Join-Path $apiRoot 'src\consult\orchestrator\evidence-composer\knowledge-retriever\knowledge-retriever.service.ts'
$bindingTest = Join-Path $apiRoot 'src\consult\orchestrator\evidence-composer\knowledge-retriever\__tests__\p0-5-validation.spec.ts'
$manifestBinding = @($manifest.files | Where-Object { $_.src -eq $bindingRelative })
$consumerReferencesBinding = Test-TextContains $bindingConsumer 'rule-knowledge-bindings.json'
$testReferencesBinding = Test-TextContains $bindingTest 'rule-knowledge-bindings.json'

if ((Test-Path -LiteralPath $bindingSource) -and $consumerReferencesBinding -and $manifestBinding.Count -eq 0) {
    Add-Result '构建资产' 'BLOCK' '运行时依赖存在但资产清单缺项' "source=True; consumer=True; test=$testReferencesBinding; manifest=False" '恢复 rule-knowledge-bindings.json 的 required 清单项并运行 verify-build。'
} elseif ($manifestBinding.Count -gt 0) {
    Add-Result '构建资产' 'PASS' '知识绑定文件已纳入资产清单' "manifest entries=$($manifestBinding.Count)" '继续验证 dist 中存在该文件。'
} else {
    Add-Result '构建资产' 'WARN' '知识绑定资产状态不明确' "source=$(Test-Path -LiteralPath $bindingSource); consumer=$consumerReferencesBinding; manifest=$($manifestBinding.Count)" '核对代码删除、路径迁移或清单缺失。'
}

# 4. Prisma Schema 与代码引用
$schemaPath = Join-Path $apiRoot 'prisma\schema.prisma'
$schemaText = [System.IO.File]::ReadAllText($schemaPath, [System.Text.Encoding]::UTF8)
$schemaHasTurn = $schemaText -match '(?m)^model\s+ConsultDialogueTurn\s*\{'
$schemaHasEmbedding = $schemaText -match '(?m)^model\s+MemoryEmbedding\s*\{'
$schemaHasLastAccessed = $schemaText -match '(?m)^\s*lastAccessedAt\s+DateTime\?'

$memoryEmbeddingService = Join-Path $apiRoot 'src\consult\memory\memory-embedding.service.ts'
$memoryForgetService = Join-Path $apiRoot 'src\consult\memory\memory-forget.service.ts'
$dialogueMigration = Join-Path $apiRoot 'prisma\migrations\20260703183000_add_consult_dialogue_turn\migration.sql'
$lastAccessMigration = Join-Path $apiRoot 'prisma\migrations\20260703183500_add_memory_last_accessed_at\migration.sql'
$embeddingMigration = Join-Path $apiRoot 'prisma\migrations\20260703184000_add_memory_embedding\migration.sql'

$codeUsesEmbedding = (Get-TextMatchCount $memoryEmbeddingService 'prisma\.memoryEmbedding|memoryEmbedding') -gt 0
$codeUsesLastAccessed = (Get-TextMatchCount $memoryForgetService 'lastAccessedAt') -gt 0
$migrationsExist = (Test-Path $dialogueMigration) -and (Test-Path $lastAccessMigration) -and (Test-Path $embeddingMigration)

if ($codeUsesEmbedding -and -not $schemaHasEmbedding) {
    Add-Result 'Prisma' 'BLOCK' 'MemoryEmbedding 代码引用与 Schema 冲突' "code=True; schema=False; migration=$(Test-Path $embeddingMigration)" '禁止提交 Schema 删除；恢复模型或先删除全部代码与迁移并形成正式决策。'
} else {
    Add-Result 'Prisma' 'PASS' 'MemoryEmbedding 代码与 Schema 一致' "code=$codeUsesEmbedding; schema=$schemaHasEmbedding" '继续执行 prisma validate、generate 与测试。'
}

if ($codeUsesLastAccessed -and -not $schemaHasLastAccessed) {
    Add-Result 'Prisma' 'BLOCK' 'lastAccessedAt 代码引用与 Schema 冲突' "code=True; schema=False; migration=$(Test-Path $lastAccessMigration)" '禁止提交字段删除；恢复字段与索引或同步移除服务逻辑并评审。'
} else {
    Add-Result 'Prisma' 'PASS' 'lastAccessedAt 代码与 Schema 一致' "code=$codeUsesLastAccessed; schema=$schemaHasLastAccessed" '继续验证生产迁移状态。'
}

if ((Test-Path $dialogueMigration) -and -not $schemaHasTurn) {
    Add-Result 'Prisma' 'BLOCK' 'ConsultDialogueTurn 迁移与 Schema 冲突' 'migration=True; schema=False' '恢复模型，或建立反向迁移和产品能力下线决策。'
} else {
    Add-Result 'Prisma' 'PASS' 'ConsultDialogueTurn Schema 与迁移一致' "migration=$(Test-Path $dialogueMigration); schema=$schemaHasTurn" '继续核对生产数据库。'
}

if ($migrationsExist) {
    Add-Result 'Prisma' 'INFO' '三份本地迁移均存在' 'DialogueTurn、lastAccessedAt、MemoryEmbedding migrations=True' '生产执行前先在数据库副本验证。'
} else {
    Add-Result 'Prisma' 'WARN' '本地迁移文件不完整' "all migrations=$migrationsExist" '补齐或明确撤销迁移。'
}

# 5. 忽略与临时文件
$backendGitignore = Join-Path $backendRoot '.gitignore'
$gitignoreText = [System.IO.File]::ReadAllText($backendGitignore, [System.Text.Encoding]::UTF8)
$gitignoreGlue = $gitignoreText -match '\.cache/#'
$gitignoreBak = $gitignoreText -match '(?m)^\*\.bak_\*$'

if ($gitignoreGlue) {
    Add-Result '仓库卫生' 'BLOCK' '后端 .gitignore 规则粘连' '.cache/ 与注释仍在同一行' '修复换行后再提交。'
} else {
    Add-Result '仓库卫生' 'PASS' '后端 .gitignore 结构正常' '.cache/ 独立成行' '保持备份规则分区清晰。'
}

if ($gitignoreBak) {
    Add-Result '仓库卫生' 'PASS' '时间戳备份已忽略' '*.bak_* 已存在' '将已有备份移入本地归档。'
} else {
    Add-Result '仓库卫生' 'WARN' '时间戳备份未统一忽略' '*.bak_* 缺失' '补充忽略规则。'
}

# 输出
$levelOrder = @{ 'BLOCK' = 0; 'WARN' = 1; 'INFO' = 2; 'PASS' = 3 }
foreach ($group in $results | Sort-Object @{ Expression = { $levelOrder[$_.Level] } }, Area, Check | Group-Object Level) {
    $color = switch ($group.Name) {
        'BLOCK' { 'Red' }
        'WARN' { 'Yellow' }
        'INFO' { 'Cyan' }
        default { 'Green' }
    }
    Write-Host ('[{0}] {1} 项' -f $group.Name, $group.Count) -ForegroundColor $color
    foreach ($item in $group.Group) {
        Write-Host ('  {0}｜{1}' -f $item.Area, $item.Check)
        Write-Host ('    证据：{0}' -f $item.Evidence)
        Write-Host ('    动作：{0}' -f $item.Action)
    }
    Write-Host ''
}

$blockCount = @($results | Where-Object Level -eq 'BLOCK').Count
$warnCount = @($results | Where-Object Level -eq 'WARN').Count
$passCount = @($results | Where-Object Level -eq 'PASS').Count
$infoCount = @($results | Where-Object Level -eq 'INFO').Count

Write-Host ('汇总：BLOCK={0} WARN={1} INFO={2} PASS={3}' -f $blockCount, $warnCount, $infoCount, $passCount)
if ($blockCount -gt 0) {
    Write-Host '[BLOCK] 当前后端边界不满足合并或发布条件。' -ForegroundColor Red
} else {
    Write-Host '[PASS] 当前未发现硬阻断项。' -ForegroundColor Green
}
Write-Host '脚本只读，未修改文件。'

if ($Strict -and $blockCount -gt 0) {
    exit 2
}
