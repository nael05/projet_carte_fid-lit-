# Script PowerShell pour appliquer les migrations DB

$mysqlPath = "C:\wamp64\bin\mariadb\mariadb11.4.9\bin\mysql.exe"
$migrationsDir = "C:\wamp64\www\projet_carte_fid-lit-\backend\migrations"
$setupDir = "C:\wamp64\www\projet_carte_fid-lit-"
$dbName = "loyalty_saas"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Applying Database Migrations" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

# Vérifier si la base de données existe
Write-Host "`n[0/3] Checking database..." -ForegroundColor Yellow
$dbExists = & $mysqlPath -u root -e "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = '$dbName';" 2>&1 | Select-String $dbName

if (-not $dbExists) {
    Write-Host "⚠️  Database '$dbName' not found. Initializing from SETUP_DATABASE.sql..." -ForegroundColor Yellow
    $setupSql = Get-Content "$setupDir\SETUP_DATABASE.sql" -Raw
    & $mysqlPath -u root -e "$setupSql" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database initialized successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to initialize database" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ Database '$dbName' found" -ForegroundColor Green
}

# Migration 1: Indexes
Write-Host "`n[1/3] Adding database indexes..." -ForegroundColor Yellow
$indexesSql = Get-Content "$migrationsDir\add-database-indexes.sql" -Raw
& $mysqlPath -u root $dbName -e "$indexesSql" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Indexes migration applied successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to apply indexes migration" -ForegroundColor Red
    exit 1
}

# Migration 2: Security
Write-Host "`n[2/3] Adding security tables..." -ForegroundColor Yellow
$securitySql = Get-Content "$migrationsDir\add-session-security.sql" -Raw
& $mysqlPath -u root $dbName -e "$securitySql" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Security migration applied successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to apply security migration" -ForegroundColor Red
    exit 1
}

# Migration 3: Optional existing migrations
Write-Host "`n[3/3] Checking for other migrations..." -ForegroundColor Yellow
$migrationFiles = Get-ChildItem "$migrationsDir\migration-*.sql" -ErrorAction SilentlyContinue
if ($migrationFiles.Count -gt 0) {
    foreach ($file in $migrationFiles) {
        Write-Host "  - Applying $($file.Name)..." -ForegroundColor DarkGray
        $migrationSql = Get-Content $file.FullName -Raw
        & $mysqlPath -u root $dbName -e "$migrationSql" 2>&1
    }
    Write-Host "✅ Other migrations applied" -ForegroundColor Green
} else {
    Write-Host "⚠️  No other migrations found (optional)" -ForegroundColor DarkYellow
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "✨ All migrations applied successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
