#!/usr/bin/env powershell
<#
.SYNOPSIS
    Script de nettoyage pour supprimer les certificats Apple Wallet obsoletes

.DESCRIPTION
    Supprime les anciens fichiers de certificats non utilises apres la migration
    vers le nouveau systeme de certificats Apple Wallet (certificat_final.p12)

.USAGE
    .\cleanup-apple-wallet-old-certs.ps1

.WARNING
    Ce script supprime des fichiers de permanence !
    Assurez-vous d'avoir une sauvegarde avant d'executer.
#>

Write-Host "Nettoyage des certificats obsoletes Apple Wallet" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$certsPath = Join-Path $projectRoot "certs"

# Fichiers obsoletes a supprimer
$oldFiles = @(
    @{ path = "signingCert.p12"; description = "Ancien certificat de signature" },
    @{ path = "wwdr.pem"; description = "Ancien certificat WWDR" }
)

# Verifier et supprimer
$filesDeleted = 0
foreach ($file in $oldFiles) {
    $fullPath = Join-Path $certsPath $file.path
    
    if (Test-Path $fullPath) {
        try {
            Write-Host "[DEL] Suppression: $($file.path)" -ForegroundColor Yellow
            Write-Host "      $($file.description)" -ForegroundColor Gray
            
            Remove-Item -Path $fullPath -Force
            Write-Host "      OK - Supprime" -ForegroundColor Green
            $filesDeleted++
        }
        catch {
            Write-Host "      ERREUR: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    else {
        Write-Host "[SKIP] Fichier non trouve: $($file.path)" -ForegroundColor Gray
    }
}

# Verifier la presence du nouveau certificat
Write-Host ""
Write-Host "Verification du nouveau certificat (apple-wallet-cert.p12)..." -ForegroundColor Cyan
$newCertPath = Join-Path $certsPath "apple-wallet-cert.p12"

if (Test-Path $newCertPath) {
    $certInfo = Get-Item $newCertPath
    Write-Host "[OK] Certificat trouve!" -ForegroundColor Green
    Write-Host "     Chemin: $newCertPath" -ForegroundColor Gray
    Write-Host "     Taille: $($certInfo.Length) bytes" -ForegroundColor Gray
    Write-Host "     Date creation: $($certInfo.CreationTime)" -ForegroundColor Gray
}
else {
    Write-Host "[ERR] Certificat nouveau NOT FOUND!" -ForegroundColor Red
    Write-Host "      Chemin attendu: $newCertPath" -ForegroundColor Red
    Write-Host "      Placez votre certificat_final.p12 a cet endroit." -ForegroundColor Yellow
}

# Resume final
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Resume du nettoyage:" -ForegroundColor Cyan
Write-Host "Fichiers supprimes: $filesDeleted" -ForegroundColor Green
Write-Host "Etat: $(if ($filesDeleted -eq $oldFiles.Count) { 'COMPLET' } else { 'PARTIEL' })" -ForegroundColor $(if ($filesDeleted -eq $oldFiles.Count) { 'Green' } else { 'Yellow' })
Write-Host ""
Write-Host "Prochaines etapes:" -ForegroundColor Cyan
Write-Host "1. Placer certificat_final.p12 en: backend\certs\apple-wallet-cert.p12" -ForegroundColor Gray
Write-Host "2. Verifier la configuration dans backend\.env" -ForegroundColor Gray
Write-Host "3. Redemarrer le serveur backend (npm start)" -ForegroundColor Gray
Write-Host ""
