#!/bin/bash
# Cleanup script - WINDOWS VERSION using PowerShell
# Note: Exécuter depuis le répertoire racine du projet

# Nettoyer les console.log des controllers
$ErrorActionPreference = 'Continue'

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🧹 Nettoyage des Console Logs" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

# 1. apiController.js
Write-Host "`n1️⃣  Nettoyage apiController.js..." -ForegroundColor Yellow
$file = "backend/controllers/apiController.js"
if (Test-Path $file) {
    $content = Get-Content $file -Raw
    $content = $content -replace 'console\.error\(err\);', 'logger.error("Error in API controller", { error: err.message });'
    Set-Content $file $content
    Write-Host "✅ apiController.js nettoyé"
} else {
    Write-Host "❌ Fichier non trouvé: $file"
}

# 2. loyaltyController.js
Write-Host "`n2️⃣  Nettoyage loyaltyController.js..." -ForegroundColor Yellow
$file = "backend/controllers/loyaltyController.js"
if (Test-Path $file) {
    $content = Get-Content $file -Raw
    $content = $content -replace 'console\.error\(err\);', 'logger.error("Error in loyalty controller", { error: err.message });'
    Set-Content $file $content
    Write-Host "✅ loyaltyController.js nettoyé"
} else {
    Write-Host "❌ Fichier non trouvé: $file"
}

# 3. Autres fichiers utils
Write-Host "`n3️⃣  Nettoyage des fichiers utils..." -ForegroundColor Yellow
$utilFiles = Get-ChildItem "backend/utils/*.js" -ErrorAction SilentlyContinue
foreach ($file in $utilFiles) {
    $content = Get-Content $file.FullName -Raw
    $modified = $content -replace 'console\.error\(err\)', 'logger.error("Util error", { error: err.message })'
    if ($modified -ne $content) {
        Set-Content $file.FullName $modified
        Write-Host "✅ $($file.Name) nettoyé"
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "✨ Nettoyage terminé!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
