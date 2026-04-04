#!/bin/bash

# Tests de Vérification - Système de Personnalisation des Cartes
# Execute: bash test-card-customization.sh

echo "🧪 Tests Système de Personnalisation des Cartes"
echo "================================================"
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Compter les tests
PASSED=0
FAILED=0

test_file() {
    local file=$1
    local description=$2
    
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $description"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $description"
        echo "  Fichier manquant: $file"
        ((FAILED++))
    fi
}

test_lines_contain() {
    local file=$1
    local search_string=$2
    local description=$3
    
    if grep -q "$search_string" "$file" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $description"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $description"
        echo "  Chaîne non trouvée dans: $file"
        ((FAILED++))
    fi
}

# ============================================
# TESTS DES FICHIERS
# ============================================
echo -e "${BLUE}[Test 1] Vérification des Fichiers${NC}"
echo "---"

test_file "backend/migrations/migration-card-customization.sql" "Migration SQL existe"
test_file "frontend/src/components/CardCustomizer.jsx" "CardCustomizer.jsx existe"
test_file "frontend/src/components/CustomerCard.jsx" "CustomerCard.jsx existe"
test_file "frontend/src/styles/CardCustomizer.css" "CardCustomizer.css existe"
test_file "frontend/src/styles/CustomerCard.css" "CustomerCard.css existe"
test_file "CARD_CUSTOMIZATION_GUIDE.md" "Documentation GUIDE existe"
test_file "CARD_CUSTOMIZATION_IMPLEMENTATION.md" "Documentation IMPLEMENTATION existe"
test_file "CARD_PERSONALIZATION_SETUP.md" "Documentation SETUP existe"

echo ""

# ============================================
# TESTS DU BACKEND
# ============================================
echo -e "${BLUE}[Test 2] Vérification du Backend${NC}"
echo "---"

test_lines_contain "backend/controllers/apiController.js" "getCardCustomization" "Fonction getCardCustomization existe"
test_lines_contain "backend/controllers/apiController.js" "updateCardCustomization" "Fonction updateCardCustomization existe"
test_lines_contain "backend/routes/apiRoutes.js" "card-customization" "Routes card-customization existent"
test_lines_contain "backend/routes/apiRoutes.js" "getCardCustomization" "Route GET connectée"
test_lines_contain "backend/routes/apiRoutes.js" "updateCardCustomization" "Route PUT connectée"

echo ""

# ============================================
# TESTS DU FRONTEND
# ============================================
echo -e "${BLUE}[Test 3] Vérification du Frontend${NC}"
echo "---"

test_lines_contain "frontend/src/pages/ProDashboard.jsx" "CardCustomizer" "CardCustomizer importé dans ProDashboard"
test_lines_contain "frontend/src/pages/ProDashboard.jsx" "card-design" "Tab 'card-design' existe dans ProDashboard"
test_lines_contain "frontend/src/pages/ProDashboard.jsx" "customization" "State customization dans ProDashboard"
test_lines_contain "frontend/src/pages/ProDashboard.jsx" "selectedClientCard" "State selectedClientCard dans ProDashboard"
test_lines_contain "frontend/src/pages/JoinWallet.jsx" "CustomerCard" "CustomerCard importé dans JoinWallet"
test_lines_contain "frontend/src/pages/JoinWallet.jsx" "loadProInfo" "loadProInfo chargé dans JoinWallet (attend customization)"
test_lines_contain "frontend/src/components/CardCustomizer.jsx" "card-customization" "CardCustomizer appelle l'API"
test_lines_contain "frontend/src/components/CustomerCard.jsx" "customization" "CustomerCard utilise customization"

echo ""

# ============================================
# TESTS DES DÉPENDANCES
# ============================================
echo -e "${BLUE}[Test 4] Vérification des Imports${NC}"
echo "---"

test_lines_contain "frontend/src/components/CardCustomizer.jsx" "import React" "CardCustomizer imports React"
test_lines_contain "frontend/src/components/CustomerCard.jsx" "import React" "CustomerCard imports React"
test_lines_contain "frontend/src/pages/ProDashboard.jsx" "CardCustomizer" "ProDashboard imports CardCustomizer"
test_lines_contain "frontend/src/pages/JoinWallet.jsx" "CustomerCard" "JoinWallet imports CustomerCard"

echo ""

# ============================================
# TESTS DE SYNTAXE CSS
# ============================================
echo -e "${BLUE}[Test 5] Vérification des Styles${NC}"
echo "---"

test_lines_contain "frontend/src/styles/CardCustomizer.css" ".card-customizer" "CardCustomizer.css a les styles"
test_lines_contain "frontend/src/styles/CardCustomizer.css" ".color-picker" "Color picker styles existent"
test_lines_contain "frontend/src/styles/CardCustomizer.css" ".preview-section" "Preview section styles existent"
test_lines_contain "frontend/src/styles/CustomerCard.css" ".loyalty-card" "CustomerCard.css a les styles"
test_lines_contain "frontend/src/styles/CustomerCard.css" ".card-pattern" "Pattern styles existent"

echo ""

# ============================================
# TESTS DE LA BD
# ============================================
echo -e "${BLUE}[Test 6] Vérification de la Migration SQL${NC}"
echo "---"

test_lines_contain "backend/migrations/migration-card-customization.sql" "card_customization" "Table card_customization existe"
test_lines_contain "backend/migrations/migration-card-customization.sql" "card_background_color" "Colonne background_color existe"
test_lines_contain "backend/migrations/migration-card-customization.sql" "card_logo_url" "Colonne logo_url existe"
test_lines_contain "backend/migrations/migration-card-customization.sql" "card_pattern" "Colonne pattern existe"
test_lines_contain "backend/migrations/migration-card-customization.sql" "FOREIGN KEY" "Foreign key vers entreprises existe"

echo ""

# ============================================
# RÉSUMÉ
# ============================================
echo "================================================"
echo -e "${BLUE}Résumé des Tests${NC}"
echo "================================================"
echo -e "${GREEN}✓ Réussis: $PASSED${NC}"
echo -e "${RED}✗ Échoués: $FAILED${NC}"

if [ $FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 Tous les tests sont passés!${NC}"
    echo "Vous pouvez maintenant:"
    echo "1. Exécuter la migration"
    echo "2. Redémarrer les serveurs"
    echo "3. Tester le système"
    exit 0
else
    echo ""
    echo -e "${RED}⚠️  Certains tests ont échoué.${NC}"
    echo "Vérifiez que tous les fichiers sont en place."
    exit 1
fi
