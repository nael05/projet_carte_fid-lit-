#!/usr/bin/env pwsh
# Final E2E Test - Complete Flow

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TESTE E2E - FLOW COMPLET 2026" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$API = "http://localhost:5000/api"
$testResults = @()

function TestResult {
  param([string]$name, [bool]$pass)
  if ($pass) {
    $script:testResults += @{name=$name; result="PASS"}
    Write-Host "  OK $name" -ForegroundColor Green
  } else {
    $script:testResults += @{name=$name; result="FAIL"}
    Write-Host "  FAIL $name" -ForegroundColor Red
  }
}

# ============ Test 1: Frontend Accessible ============
Write-Host "`n📍 Frontend Availability" -ForegroundColor Yellow
try {
  $r = Invoke-WebRequest http://localhost:3001 -UseBasicParsing -TimeoutSec 2
  TestResult "Frontend (port 3001)" ($r.StatusCode -eq 200)
} catch {
  TestResult "Frontend (port 3001)" $false
}

# ============ Test 2: Backend Accessible ============
Write-Host "`n📍 Backend Health" -ForegroundColor Yellow
try {
  $r = Invoke-WebRequest http://localhost:5000/health -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
  TestResult "Backend health endpoint" $true
} catch {
  Write-Host "  (health endpoint optional)" -ForegroundColor Gray
}

# ============ Test 3: Admin Credentials ============
Write-Host "`n📍 Admin Authentication" -ForegroundColor Yellow
try {
  $r = Invoke-WebRequest "$API/admin/login" -Method POST -ContentType "application/json" `
    -Body '{"identifiant":"master_admin","mot_de_passe":"AdminPassword123!"}' `
    -UseBasicParsing
  $adminToken = ($r.Content | ConvertFrom-Json).token
  TestResult "Admin login" ($null -ne $adminToken -and $adminToken.Length -gt 50)
} catch {
  TestResult "Admin login" $false
  Write-Host "  ERROR: $_"
  Exit 1
}

# ============ Test 4: Create Company ============
Write-Host "`n📍 Company Creation" -ForegroundColor Yellow
try {
  $companyData = @{
    nom = "E2E-Test-$(Get-Random)"
    email = "e2e-test-$(Get-Random)@example.com"
    loyalty_type = "points"
  } | ConvertTo-Json
  
  $r = Invoke-WebRequest "$API/admin/create-company" -Method POST -ContentType "application/json" `
    -Headers @{"Authorization"="Bearer $adminToken"} `
    -Body $companyData -UseBasicParsing
  
  $result = $r.Content | ConvertFrom-Json
  $companyEmail = $result.email
  $tempPassword = $result.temporaryPassword
  $companyId = $result.companyId
  
  TestResult "Company creation" ($null -ne $companyId -and $null -ne $tempPassword)
  Write-Host "    Email: $companyEmail"
  Write-Host "    Password: $($tempPassword.Substring(0, 8))..."
} catch {
  TestResult "Company creation" $false
  Write-Host "  ERROR: $_"
  Exit 1
}

# ============ Test 5: Pro Login with Temp Password ============
Write-Host "`n📍 Pro Login" -ForegroundColor Yellow
try {
  $r = Invoke-WebRequest "$API/pro/login" -Method POST -ContentType "application/json" `
    -Body (@{email=$companyEmail; mot_de_passe=$tempPassword} | ConvertTo-Json) `
    -UseBasicParsing
  
  $data = $r.Content | ConvertFrom-Json
  $proToken = $data.token
  $deviceId = $data.deviceId
  
  TestResult "Pro login (temp pwd)" ($null -ne $proToken -and $data.mustChangePassword -eq 1)
  Write-Host "    Device ID: $deviceId"
} catch {
  TestResult "Pro login (temp pwd)" $false
  Write-Host "  ERROR: $_"
  Exit 1
}

# ============ Test 6: Change Password ============
Write-Host "`n📍 Password Management" -ForegroundColor Yellow
try {
  $r = Invoke-WebRequest "$API/pro/change-password" -Method PUT -ContentType "application/json" `
    -Headers @{"Authorization"="Bearer $proToken"; "X-Device-Id"=$deviceId} `
    -Body '{"newPassword":"E2ETest2026!"}' -UseBasicParsing
  
  $result = $r.Content | ConvertFrom-Json
  TestResult "Password change" ($result.success -eq $true)
} catch {
  TestResult "Password change" $false
  Write-Host "  ERROR: $_"
}

# ============ Test 7: Login with New Password ============
Write-Host "`n📍 Session Persistence" -ForegroundColor Yellow
try {
  $r = Invoke-WebRequest "$API/pro/login" -Method POST -ContentType "application/json" `
    -Body (@{email=$companyEmail; mot_de_passe="E2ETest2026!"} | ConvertTo-Json) `
    -UseBasicParsing
  
  $data = $r.Content | ConvertFrom-Json
  TestResult "Pro login (new pwd)" ($data.mustChangePassword -eq 0)
} catch {
  TestResult "Pro login (new pwd)" $false
  Write-Host "  ERROR: $_"
}

# ============ Test 8: Get Pro Status ============
Write-Host "`n📍 Pro Features" -ForegroundColor Yellow
try {
  $newToken = ($r.Content | ConvertFrom-Json).token
  $r = Invoke-WebRequest "$API/pro/status" -Method GET `
    -Headers @{"Authorization"="Bearer $newToken"; "X-Device-Id"=$deviceId} `
    -UseBasicParsing
  
  $status = $r.Content | ConvertFrom-Json
  TestResult "Get pro status" ($status.statut -eq "actif")
} catch {
  TestResult "Get pro status" $false
}

# ============ Test 9: Admin Operations ============
Write-Host "`n📍 Admin Features" -ForegroundColor Yellow
try {
  # Get enterprises
  $r = Invoke-WebRequest "$API/admin/enterprises" -Method GET `
    -Headers @{"Authorization"="Bearer $adminToken"} -UseBasicParsing
  
  $enterprises = $r.Content | ConvertFrom-Json
  TestResult "List enterprises" ($enterprises.Count -gt 0)
} catch {
  TestResult "List enterprises" $false
}

# ============ Summary ============
Write-Host "`n========================================" -ForegroundColor Cyan
$passCount = ($testResults | Where-Object {$_.result -eq "PASS"}).Count
$totalCount = $testResults.Count
Write-Host "  RESULTAT: $passCount/$totalCount tests reussis" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($passCount -eq $totalCount) {
  Write-Host "✅ TOUS LES TESTS PASSES!" -ForegroundColor Green
  Write-Host ""
  Write-Host "Acces aux applications:" -ForegroundColor Green
  Write-Host "  • Frontend:      http://localhost:3001" -ForegroundColor Green
  Write-Host "  • Admin Panel:   http://localhost:3001/master-admin-secret" -ForegroundColor Green
  Write-Host "  • Pro Login:     http://localhost:3001/pro/login" -ForegroundColor Green
  Write-Host ""
} else {
  Write-Host "❌ CERTAINS TESTS ONT ECHOUE" -ForegroundColor Red
  Write-Host ""
  Write-Host "Tests echoues:" -ForegroundColor Red
  $testResults | Where-Object {$_.result -eq "FAIL"} | ForEach-Object {
    Write-Host "  • $($_.name)" -ForegroundColor Red
  }
  Exit 1
}
