# Script pour démarrer le backend et le frontend

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Démarrage des serveurs LoyaltyCore" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier si WAMP est démarré
Write-Host "📋 Vérification de WAMP..." -ForegroundColor Yellow
$wampRunning = Get-Process -Name "wampmanager" -ErrorAction SilentlyContinue
if (-not $wampRunning) {
    Write-Host "⚠️  WAMP n'est pas démarré. Veuillez démarrer WAMP64 d'abord." -ForegroundColor Red
    Write-Host "   Téléchargez-le sur https://www.wampserver.com/" -ForegroundColor Gray
    exit 1
}
Write-Host "✅ WAMP est démarré" -ForegroundColor Green
Write-Host ""

# Démarrer le backend
Write-Host "🚀 Démarrage du backend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; Write-Host 'Backend démarré sur http://localhost:5000' -ForegroundColor Green; npm start"

# Attendre un peu que le backend démarre
Start-Sleep -Seconds 2

# Démarrer le frontend
Write-Host "🚀 Démarrage du frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; Write-Host 'Frontend démarré sur http://localhost:3000' -ForegroundColor Green; npm run dev"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Serveurs démarrés avec succès!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📍 Backend:  http://localhost:5000" -ForegroundColor Blue
Write-Host "📍 Frontend: http://localhost:3000" -ForegroundColor Blue
Write-Host ""
Write-Host "🔐 Identifiants admin par défaut:" -ForegroundColor Yellow
Write-Host "   URL: http://localhost:3000/master-admin-secret" -ForegroundColor Gray
Write-Host "   Identifiant: master_admin" -ForegroundColor Gray
Write-Host "   Mot de passe: AdminPassword123!" -ForegroundColor Gray
Write-Host ""
Write-Host "Appuyez sur une touche pour ouvrir le frontend dans le navigateur..." -ForegroundColor White
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
Start-Process "http://localhost:3000"