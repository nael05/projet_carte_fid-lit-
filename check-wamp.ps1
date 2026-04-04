# Script de vérification pré-démarrage WAMP

Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║    Vérification de l'installation WAMP         ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# 1. Vérifier les ports
Write-Host "🔍 Vérification des ports..."
$port3306 = Test-NetConnection -ComputerName localhost -Port 3306 -WarningAction SilentlyContinue
$port8080 = Test-NetConnection -ComputerName localhost -Port 8080 -WarningAction SilentlyContinue

if ($port3306.TcpTestSucceeded) {
    Write-Host "✅ MySQL (port 3306): ACTIF" -ForegroundColor Green
} else {
    Write-Host "❌ MySQL (port 3306): INACTIF" -ForegroundColor Red
}

if ($port8080.TcpTestSucceeded) {
    Write-Host "✅ Apache (port 8080): ACTIF" -ForegroundColor Green
} else {
    Write-Host "⚠️ Apache (port 8080): INACTIF" -ForegroundColor Yellow
}

Write-Host ""

# 2. Chercher WampServer
Write-Host "🔍 Recherche de WampServer..."
$wampPaths = @(
    "C:\wamp64\wampmanager.exe",
    "C:\wamp\wampmanager.exe",
    "C:\xampp\xampp-control.exe"
)

$wampFound = $null
foreach ($path in $wampPaths) {
    if (Test-Path $path) {
        Write-Host "✅ Trouvé: $path" -ForegroundColor Green
        $wampFound = $path
        break
    }
}

if (-not $wampFound) {
    Write-Host "❌ WAMP non trouvé" -ForegroundColor Red
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

# 3. Recommandations
if (-not $port3306.TcpTestSucceeded) {
    Write-Host ""
    Write-Host "⚠️ MySQL n'est pas accessible!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Solution:" -ForegroundColor Yellow
    Write-Host "1. Lancez WampServer (cliquez sur l'icône)" -ForegroundColor White
    Write-Host "2. Attendez que MySQL soit vert" -ForegroundColor White
    Write-Host "3. Attendez 30 secondes" -ForegroundColor White
    Write-Host "4. Relancez ce script" -ForegroundColor White
    Write-Host ""
    exit 1
} else {
    Write-Host ""
    Write-Host "✅ Tous les services sont actifs!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Prochaine étape:" -ForegroundColor Yellow
    Write-Host "Aller sur: http://localhost/phpmyadmin" -ForegroundColor Cyan
    Write-Host "Puis importer le schema.sql" -ForegroundColor Cyan
    Write-Host ""
}
