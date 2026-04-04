#!/bin/bash
# Script de configuration initiale du projet

echo "🚀 Initialisation du projet Loyalty Cards SaaS..."

# Backend
echo ""
echo "📦 Installation Backend..."
cd backend
npm install
echo "✅ Backend prêt"

# Frontend
echo ""
echo "📦 Installation Frontend..."
cd ../frontend
npm install
echo "✅ Frontend prêt"

echo ""
echo "✨ Installation terminée !"
echo ""
echo "Prochaines étapes :"
echo "1. Créer la base de données : mysql -u root -p < schema.sql"
echo "2. Configurer .env : backend/.env"
echo "3. Démarrer backend : cd backend && npm run dev"
echo "4. Démarrer frontend : cd frontend && npm run dev"
echo ""
echo "Accédez à http://localhost:3000"
