#!/bin/bash

# deploy_setup.sh - Script d'installation automatisé pour Fidelyz sur Ubuntu 22.04
# Usage: curl -sSL https://raw.githubusercontent.com/nael05/projet_carte_fid-lit-/main/deploy_setup.sh | bash

set -e

echo "🚀 Démarrage de l'installation de Fidelyz sur fidelyzapp.fr..."

# 1. Mise à jour du système
echo "📦 Mise à jour du système..."
sudo apt update && sudo apt upgrade -y

# 2. Installation des dépendances
echo "🛠️ Installation des outils (Git, Curl, Nginx)..."
sudo apt install -y git curl nginx certbot python3-certbot-nginx

# 3. Installation de Node.js 20
echo "🟢 Installation de Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 4. Installation de MySQL
echo "🐬 Installation de MySQL Server..."
sudo apt install -y mysql-server
# Démarrage automatique
sudo systemctl start mysql
sudo systemctl enable mysql

# 5. Installation de PM2 (Gestionnaire de processus)
echo "⚡ Installation de PM2..."
sudo npm install -g pm2

# 6. Clonage du projet
echo "📂 Clonage du projet depuis GitHub..."
cd /var/www
if [ -d "projet_carte_fid-lit-" ]; then
    echo "⚠️ Le dossier existe déjà, mise à jour..."
    cd projet_carte_fid-lit- && git pull
else
    sudo git clone https://github.com/nael05/projet_carte_fid-lit-.git
    cd projet_carte_fid-lit-
fi

# Permissions
sudo chown -R $USER:$USER /var/www/projet_carte_fid-lit-

# 7. Installation des dépendances Backend
echo "📥 Installation des dépendances Backend..."
cd backend
npm install

# 8. Installation des dépendances Frontend & Build
echo "🏗️ Installation des dépendances Frontend & Build..."
cd ../frontend
npm install
npm run build

# 9. Configuration Nginx
echo "🌐 Configuration de Nginx..."
sudo tee /etc/nginx/sites-available/fidelyzapp.fr > /dev/null <<EOF
server {
    listen 80;
    server_name fidelyzapp.fr www.fidelyzapp.fr;

    # Frontend (Fichiers Build de Vite)
    location / {
        root /var/www/projet_carte_fid-lit-/frontend/dist;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    # Dossier Uploads (Logos, Tampons)
    location /uploads {
        alias /var/www/projet_carte_fid-lit-/backend/uploads;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/fidelyzapp.fr /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

echo "✅ Installation terminée !"
echo "👉 Prochaine étape : Configurer le .env et lancer PM2."
