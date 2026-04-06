# PowerShell script to clean up console logs in controllers
# Usage: .\clean-console-logs.ps1

Write-Host "Cleaning console.log from apiController.js..." -ForegroundColor Yellow
$apiFile = Get-Content "backend/controllers/apiController.js" -Raw
$apiFile = $apiFile -replace 'console\.error\(err\);', 'logger.error("API error", { error: err.message });'
$apiFile = $apiFile -replace 'console\.log\(', 'logger.info('
$apiFile = $apiFile -replace "console\.error\('", "logger.error('"
$apiFile = $apiFile -replace "console\.error\(`"", "logger.error(`""
Set-Content "backend/controllers/apiController.js" $apiFile

Write-Host "Cleaning console.log from loyaltyController.js..." -ForegroundColor Yellow
$loyaltyFile = Get-Content "backend/controllers/loyaltyController.js" -Raw
$loyaltyFile = $loyaltyFile -replace 'console\.error\(err\);', 'logger.error("Loyalty error", { error: err.message });'
$loyaltyFile = $loyaltyFile -replace 'console\.log\(', 'logger.info('
Set-Content "backend/controllers/loyaltyController.js" $loyaltyFile

Write-Host "✅ Console logs cleaned!" -ForegroundColor Green
