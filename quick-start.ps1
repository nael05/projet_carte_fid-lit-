#!/usr/bin/env pwsh
# Quick Start Script - Loyalty System

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  LOYALTY SAAS - QUICK START" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$backendPath = "c:\wamp64\www\projet_carte_fid-lit-\backend"
$frontendPath = "c:\wamp64\www\projet_carte_fid-lit-\frontend"

# Check if already running
$portCheck3001 = Test-NetConnection -ComputerName localhost -Port 3001 -WarningAction SilentlyContinue -ErrorAction SilentlyContinue | Select-Object -ExpandProperty TcpTestSucceeded
$portCheck5000 = Test-NetConnection -ComputerName localhost -Port 5000 -WarningAction SilentlyContinue -ErrorAction SilentlyContinue | Select-Object -ExpandProperty TcpTestSucceeded

Write-Host "Etat actuel:" -ForegroundColor Yellow
Write-Host "  Frontend (3001):  $(if ($portCheck3001) {'RUNNING'} else {'Stopped'})" -ForegroundColor $(if ($portCheck3001) {'Green'} else {'Gray'})
Write-Host "  Backend (5000):   $(if ($portCheck5000) {'RUNNING'} else {'Stopped'})" -ForegroundColor $(if ($portCheck5000) {'Green'} else {'Gray'})
Write-Host ""

# Options
Write-Host "Options:" -ForegroundColor Yellow
Write-Host "  1. Demarrer backend uniquement" -ForegroundColor Cyan
Write-Host "  2. Demarrer frontend uniquement" -ForegroundColor Cyan
Write-Host "  3. Demarrer TOUS les services" -ForegroundColor Cyan
Write-Host "  4. Tests complets" -ForegroundColor Cyan
Write-Host "  5. Documentation" -ForegroundColor Cyan
Write-Host "  6. Exit" -ForegroundColor Cyan
Write-Host ""

$choice = Read-Host "Choisissez (1-6)"

switch ($choice) {
  "1" {
    Write-Host ""
    Write-Host "Demarrage Backend..." -ForegroundColor Green
    Set-Location $backendPath
    npm start
  }
  
  "2" {
    Write-Host ""
    Write-Host "Demarrage Frontend..." -ForegroundColor Green
    Set-Location $frontendPath
    npm run dev
  }
  
  "3" {
    Write-Host ""
    Write-Host "Demarrage TOUS les services..." -ForegroundColor Green
    Write-Host ""
    
    # Backend in new window
    Write-Host "  1. Backend (port 5000)..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit -Command `"Set-Location '$backendPath'; npm start`""
    
    Start-Sleep -Seconds 3
    
    # Frontend in new window
    Write-Host "  2. Frontend (port 3001)..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit -Command `"Set-Location '$frontendPath'; npm run dev`""
    
    Write-Host ""
    Write-Host "Les deux services demarrent dans de nouvelles fenetres..." -ForegroundColor Green
    Write-Host ""
    Write-Host "Acces:" -ForegroundColor Cyan
    Write-Host "  Frontend:       http://localhost:3001" -ForegroundColor Green
    Write-Host "  Admin Panel:    http://localhost:3001/master-admin-secret" -ForegroundColor Green
    Write-Host "  Pro Login:      http://localhost:3001/pro/login" -ForegroundColor Green
    Write-Host ""
    Write-Host "Admin Credentials:" -ForegroundColor Cyan
    Write-Host "  ID: master_admin" -ForegroundColor Yellow
    Write-Host "  PWD: AdminPassword123!" -ForegroundColor Yellow
    Write-Host ""
  }
  
  "4" {
    Write-Host ""
    Write-Host "Tests complets..." -ForegroundColor Green
    & 'c:\wamp64\www\projet_carte_fid-lit-\test-complete-flow.ps1'
  }
  
  "5" {
    Write-Host ""
    Write-Host "Documentation disponible:" -ForegroundColor Green
    Write-Host "  • COMPLETE_GUIDE.md" -ForegroundColor Cyan
    Write-Host "  • VALIDATION_FINAL.md" -ForegroundColor Cyan
    Write-Host ""
    $openDoc = Read-Host "Ouvrir quelle doc? (complete/validation/none)"
    
    switch ($openDoc) {
      "complete" { Start-Process "c:\wamp64\www\projet_carte_fid-lit-\COMPLETE_GUIDE.md" }
      "validation" { Start-Process "c:\wamp64\www\projet_carte_fid-lit-\VALIDATION_FINAL.md" }
      default { Write-Host "OK" }
    }
  }
  
  default {
    Write-Host "Exit" -ForegroundColor Yellow
  }
}
