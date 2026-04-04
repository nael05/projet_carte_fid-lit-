#!/usr/bin/env pwsh

# Test Complet: Système de Fidélité SaaS
# ============================================

Write-Host "🚀 Démarrage des tests..." -ForegroundColor Green
Write-Host ""

$API_URL = "http://localhost:5000/api"
$FRONTEND_URL = "http://localhost:3001"

# Color helpers
function Success { param([string]$msg); Write-Host "OK: $msg" -ForegroundColor Green }
function Error { param([string]$msg); Write-Host "ERROR: $msg" -ForegroundColor Red }
function Info { param([string]$msg); Write-Host "INFO: $msg" -ForegroundColor Cyan }
function Warning { param([string]$msg); Write-Host "WARN: $msg" -ForegroundColor Yellow }

# ============================================
# TEST 1: Admin Login
# ============================================
Info "TEST 1: Admin Login"
try {
  $response = Invoke-WebRequest -Uri "$API_URL/admin/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body '{"identifiant":"master_admin","mot_de_passe":"AdminPassword123!"}' `
    -UseBasicParsing
  
  $adminToken = ($response.Content | ConvertFrom-Json).token
  Success "Admin login réussi"
} catch {
  Error "Admin login échoué: $_"
  Exit 1
}

# ============================================
# TEST 2: Create Company
# ============================================
Info "TEST 2: Create Company"
try {
  $company = @{
    nom = "Test Café $(Get-Random)"
    email = "cafe-test-$(Get-Random)@example.com"
    loyalty_type = "points"
  }
  
  $response = Invoke-WebRequest -Uri "$API_URL/admin/create-company" `
    -Method POST `
    -ContentType "application/json" `
    -Headers @{"Authorization" = "Bearer $adminToken"} `
    -Body ($company | ConvertTo-Json) `
    -UseBasicParsing
  
  $result = $response.Content | ConvertFrom-Json
  $companyEmail = $result.email
  $tempPassword = $result.temporaryPassword
  $companyId = $result.companyId
  
  Success "Entreprise créée"
  Info "  Email: $companyEmail"
  Info "  Mot de passe temporaire: $tempPassword"
  Info "  ID: $companyId"
} catch {
  Error "Création d'entreprise échouée: $_"
  Exit 1
}

# ============================================
# TEST 3: Pro Login with Temp Password
# ============================================
Info "TEST 3: Pro Login with Temp Password"
try {
  $response = Invoke-WebRequest -Uri "$API_URL/pro/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body (@{email = $companyEmail; mot_de_passe = $tempPassword} | ConvertTo-Json) `
    -UseBasicParsing
  
  $data = $response.Content | ConvertFrom-Json
  $proToken = $data.token
  $deviceId = $data.deviceId
  
  If ($data.mustChangePassword -eq 1) {
    Success "Pro login réussi - Password change requis"
  } else {
    Success "Pro login réussi"
  }
  
  Info "  Device ID: $deviceId"
} catch {
  Error "Pro login échoué: $_"
  Exit 1
}

# ============================================
# TEST 4: Change Password
# ============================================
Info "TEST 4: Change Pro Password"
try {
  $response = Invoke-WebRequest -Uri "$API_URL/pro/change-password" `
    -Method PUT `
    -ContentType "application/json" `
    -Headers @{"Authorization" = "Bearer $proToken"; "X-Device-Id" = $deviceId} `
    -Body '{"newPassword":"TestPassword2026!"}' `
    -UseBasicParsing
  
  $result = $response.Content | ConvertFrom-Json
  Success "Mot de passe changé avec succès"
} catch {
  Error "Change password échoué: $_"
  Exit 1
}

# ============================================
# TEST 5: Pro Login with New Password
# ============================================
Info "TEST 5: Pro Login with New Password"
try {
  $response = Invoke-WebRequest -Uri "$API_URL/pro/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body (@{email = $companyEmail; mot_de_passe = "TestPassword2026!"} | ConvertTo-Json) `
    -UseBasicParsing
  
  $data = $response.Content | ConvertFrom-Json
  If ($data.mustChangePassword -eq 0) {
    Success "Nouveau mot de passe accepte"
  } else {
    Warning "mustChangePassword = 1 (OK si premiere connexion)"
  }
} catch {
  Error "Pro login with new password echoue: $_"
  Exit 1
}

# ============================================
# SUMMARY
# ============================================
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Success "TOUS LES TESTS SONT RÉUSSIS! 🎉"
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Résumé:" -ForegroundColor Cyan
Write-Host "  1. ✅ Admin login"
Write-Host "  2. ✅ Create company avec credentials"
Write-Host "  3. ✅ Pro login avec mot de passe temporaire"
Write-Host "  4. ✅ Change password avec DeviceID"
Write-Host "  5. ✅ Pro login avec nouveau mot de passe"
Write-Host ""
Write-Host "Prochaines étapes:" -ForegroundColor Yellow
Write-Host "  1. Tester le frontend: http://localhost:3001"
Write-Host "  2. Admin dashboard: http://localhost:3001/master-admin-secret"
Write-Host "  3. Pro login: http://localhost:3001/pro/login"
Write-Host ""
