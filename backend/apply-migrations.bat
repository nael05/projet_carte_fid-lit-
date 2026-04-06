@echo off
REM Script pour appliquer les migrations DB

cd /d "C:\wamp64\www\projet_carte_fid-lit-\backend"

echo.
echo ========================================
echo Applying Database Migrations
echo ========================================
echo.

REM Ajouter les indexes
echo [1/2] Adding database indexes...
mysql -u root loyalty_db < migrations/add-database-indexes.sql
if errorlevel 1 (
    echo ERROR: Failed to apply indexes migration
    exit /b 1
)

REM Ajouter les tables de sécurité
echo [2/2] Adding security tables...
mysql -u root loyalty_db < migrations/add-session-security.sql
if errorlevel 1 (
    echo ERROR: Failed to apply security migration
    exit /b 1
)

echo.
echo ========================================
echo Migrations applied successfully!
echo ========================================
echo.

pause
