# Script pour lancer backend et frontend simultanement
$projectRoot = "C:\wamp64\www\projet_carte_fid-lit-"
$backendPath = Join-Path $projectRoot "backend"
$frontendPath = Join-Path $projectRoot "frontend"

Write-Host "========================================"
Write-Host "Demarrage des serveurs..."
Write-Host "========================================"

# Lancer le backend
Write-Host "`nLancement du Backend (Port 5000)..."
Start-Job -Name "Backend" -ScriptBlock {
    param($path)
    cd $path
    npm start
} -ArgumentList $backendPath

# Attendre un peu pour que le backend démarre
Start-Sleep -Seconds 3

# Lancer le frontend
Write-Host "`nLancement du Frontend (Port 5173)..."
Start-Job -Name "Frontend" -ScriptBlock {
    param($path)
    cd $path
    npm run dev
} -ArgumentList $frontendPath

# Afficher les jobs
Write-Host "`nServeurs lances!"
Write-Host "`nStatus des jobs:"
Get-Job

Write-Host "`n========================================"
Write-Host "Serveurs actifs:"
Write-Host "  Backend:  http://localhost:5000"
Write-Host "  Frontend: http://localhost:5173"
Write-Host "========================================" 

