# Create fresh test company for pro login testing
param()

Write-Host "Creating test company credentials..." -ForegroundColor Cyan

# Step 1: Admin login
$adminBody = @{
    identifiant = "master_admin"
    mot_de_passe = "AdminPassword123!"
} | ConvertTo-Json

try {
    $adminResp = Invoke-RestMethod -Uri 'http://localhost:5000/api/admin/login' -Method POST -ContentType 'application/json' -Body $adminBody
    $adminToken = $adminResp.token
    
    Write-Host "✅ Admin login OK" -ForegroundColor Green
    
    # Step 2: Create company
    $randomId = Get-Random
    $testEmail = "pro-test-$randomId@example.com"
    
    $companyData = @{
        nom = "Test Loyalty $randomId"
        email = $testEmail
        loyalty_type = "points"
    } | ConvertTo-Json
    
    $headers = @{
        "Authorization" = "Bearer $adminToken"
    }
    
    $compResp = Invoke-RestMethod -Uri 'http://localhost:5000/api/admin/create-company' -Method POST -ContentType 'application/json' -Headers $headers -Body $companyData
    
    Write-Host ""
    Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "✅ TEST COMPANY CREATED SUCCESSFULLY" -ForegroundColor Green
    Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📧 EMAIL:    " ($compResp.email) -ForegroundColor Yellow
    Write-Host "🔐 PASSWORD: " ($compResp.temporary_password) -ForegroundColor Yellow
    Write-Host ""
    Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "👉 OPEN THIS URL TO LOGIN:" -ForegroundColor Green
    Write-Host "   http://localhost:3001/pro/login" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "💡 YOU WILL BE ASKED TO:" -ForegroundColor Yellow
    Write-Host "   1. Login with email + password above" -ForegroundColor Gray
    Write-Host "   2. Change password on first login" -ForegroundColor Gray
    Write-Host "   3. Access your pro dashboard" -ForegroundColor Gray
    Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Error: " $_.Exception.Message -ForegroundColor Red
}
