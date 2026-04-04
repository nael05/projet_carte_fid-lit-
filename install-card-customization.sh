#!/bin/bash

# Script d'installation du système de personnalisation des cartes
# Exécutez ce script pour déployer la fonctionnalité complète

echo "🎨 Installation du Système de Personnalisation des Cartes de Fidélité"
echo "=================================================================="
echo ""

# Couleurs pour le terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Vérifier que MySQL est accessible
echo -e "${YELLOW}[1/4] Vérification de la connexion MySQL...${NC}"
if ! mysql -u root -e "SELECT 1" &> /dev/null; then
    echo -e "${RED}❌ Erreur: Impossible de se connecter à MySQL${NC}"
    echo "Assurez-vous que MySQL est démarré et accessible"
    exit 1
fi
echo -e "${GREEN}✓ MySQL accessible${NC}"
echo ""

# 2. Exécuter la migration
echo -e "${YELLOW}[2/4] Exécution de la migration de la base de données...${NC}"
if mysql -u root card_loyalty < "./migrations/migration-card-customization.sql" 2>/dev/null; then
    echo -e "${GREEN}✓ Migration réussie${NC}"
else
    echo -e "${RED}❌ Erreur lors de la migration${NC}"
    echo "Vérifiez que le fichier migrations/migration-card-customization.sql existe"
    exit 1
fi
echo ""

# 3. Vérifier les fichiers React
echo -e "${YELLOW}[3/4] Vérification des fichiers Frontend...${NC}"
FILES_FRONTEND=(
    "src/components/CardCustomizer.jsx"
    "src/components/CustomerCard.jsx"
    "src/styles/CardCustomizer.css"
    "src/styles/CustomerCard.css"
    "src/pages/ProDashboard.jsx"
    "src/pages/JoinWallet.jsx"
)

cd frontend
for file in "${FILES_FRONTEND[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓ $file${NC}"
    else
        echo -e "${RED}❌ Fichier manquant: $file${NC}"
        exit 1
    fi
done
cd ..
echo ""

# 4. Vérifier les fichiers Backend
echo -e "${YELLOW}[4/4] Vérification des fichiers Backend...${NC}"
FILES_BACKEND=(
    "controllers/apiController.js"
    "routes/apiRoutes.js"
)

cd backend
for file in "${FILES_BACKEND[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓ $file${NC}"
    else
        echo -e "${RED}❌ Fichier manquant: $file${NC}"
        exit 1
    fi
done
cd ..
echo ""

echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Installation réussie!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo ""
echo "Prochaines étapes:"
echo "1. Redémarrez les serveurs:"
echo "   Backend: cd backend && npm run dev"
echo "   Frontend: cd frontend && npm run dev"
echo ""
echo "2. Accédez au tableau de bord pro et allez à l'onglet '🎨 Design Carte'"
echo ""
echo "3. Pour tester:"
echo "   - Personnalisez une carte"
echo "   - Allez à une page de création de client pour voir le résultat"
echo ""
echo "📚 Documentation complète:"
echo "   - CARD_CUSTOMIZATION_GUIDE.md - Guide détaillé"
echo "   - CARD_CUSTOMIZATION_IMPLEMENTATION.md - Détails techniques"
echo ""
