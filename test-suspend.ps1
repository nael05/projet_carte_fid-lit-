# Script PowerShell pour tester la suspension d'entreprise
# CONFIGURATION
$adminIdentifiant = "master_admin"
$adminPassword = "AdminPassword123!"
$apiUrl = "http://localhost:5000/api"

Write-Host "🔐 Étape 1: Connexion Master Admin..."
$loginResponse = Invoke-WebRequest -Uri "$apiUrl/admin/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body (@{
    identifiant = $adminIdentifiant
    mot_de_passe = $adminPassword
  } | ConvertTo-Json)

$token = ($loginResponse.Content | ConvertFrom-Json).token
Write-Host "✅ Token reçu: $($token.Substring(0, 20))..."

Write-Host "`n📊 Étape 2: Récupération des entreprises..."
$enterprisesResponse = Invoke-WebRequest -Uri "$apiUrl/admin/enterprises" `
  -Method GET `
  -Headers @{Authorization = "Bearer $token"}

$enterprises = $enterprisesResponse.Content | ConvertFrom-Json
Write-Host "✅ Entreprises récupérées:"
$enterprises | ForEach-Object { Write-Host "  - $($_.nom) (ID: $($_.id)) - Statut: $($_.statut)" }

if ($enterprises.Count -gt 0) {
  $companyToSuspend = $enterprises[0]
  $companyId = $companyToSuspend.id
  
  Write-Host "`n🔴 Étape 3: Suspension de '$($companyToSuspend.nom)'..."
  try {
    $suspendResponse = Invoke-WebRequest -Uri "$apiUrl/admin/suspend-company/$companyId" `
      -Method PUT `
      -Headers @{Authorization = "Bearer $token"} `
      -Body ""
    
    $result = $suspendResponse.Content | ConvertFrom-Json
    Write-Host "✅ Suspension réussie: $($result.message)"
  } catch {
    Write-Host "❌ Erreur suspension:"
    Write-Host "Status: $($_.Exception.Response.StatusCode)"
    Write-Host "Erreur: $($_.Exception.Response.Content | ConvertFrom-Json | ConvertTo-Json)"
  }
  
  Write-Host "`n📊 Étape 4: Vérification du nouveau statut..."
  $checkResponse = Invoke-WebRequest -Uri "$apiUrl/admin/enterprises" `
    -Method GET `
    -Headers @{Authorization = "Bearer $token"}
  
  $updatedEnterprises = $checkResponse.Content | ConvertFrom-Json
  $updatedCompany = $updatedEnterprises | Where-Object { $_.id -eq $companyId }
  Write-Host "✅ Statut après suspension: $($updatedCompany.statut)"
}
