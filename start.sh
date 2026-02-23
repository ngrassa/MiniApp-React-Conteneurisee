#!/bin/bash
# ═══════════════════════════════════════════════════════════
#  NetPulse — VERSION CLASSIQUE
#  Installation Node.js + npm start
#  ISET Sousse — Cours Cloud & Réseaux Modernes
# ═══════════════════════════════════════════════════════════

set -e
GREEN='\033[0;32m'; BLUE='\033[0;34m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════╗"
echo "║   NetPulse — VERSION CLASSIQUE (npm start)           ║"
echo "║   Exécution directe sur Ubuntu via Node.js           ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ─── 1. Vérifier / Installer Node.js ──────────────────────
echo -e "${YELLOW}[1/3] Vérification de Node.js...${NC}"
if command -v node &>/dev/null; then
    NODE_VER=$(node -v)
    echo -e "${GREEN}  ✓ Node.js déjà installé : $NODE_VER${NC}"
    # Vérifier version minimale (18+)
    NODE_MAJOR=$(echo $NODE_VER | sed 's/v\([0-9]*\).*/\1/')
    if [ "$NODE_MAJOR" -lt 18 ]; then
        echo -e "${YELLOW}  ⚠ Version trop ancienne, mise à jour vers Node.js 20...${NC}"
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
else
    echo -e "${YELLOW}  Installation de Node.js 20 LTS...${NC}"
    sudo apt-get update -y
    sudo apt-get install -y ca-certificates curl gnupg
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo -e "${GREEN}  ✓ Node.js installé : $(node -v)${NC}"
fi
echo -e "${GREEN}  ✓ npm : $(npm -v)${NC}"

# ─── 2. Installer les dépendances npm ─────────────────────
echo -e "${YELLOW}[2/3] Installation des dépendances npm...${NC}"
npm install --legacy-peer-deps
echo -e "${GREEN}  ✓ node_modules installé ($(du -sh node_modules 2>/dev/null | cut -f1) sur disque)${NC}"

# ─── 3. Lancer l'application ───────────────────────────────
echo -e "${YELLOW}[3/3] Démarrage du serveur de développement...${NC}"
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗"
echo -e "║  ✓  Application démarrée !                           ║"
echo -e "╠══════════════════════════════════════════════════════╣"
echo -e "║  🌐  http://localhost:3000                            ║"
echo -e "╠══════════════════════════════════════════════════════╣"
echo -e "║  CARACTÉRISTIQUES VERSION CLASSIQUE :                 ║"
echo -e "║  • Serveur : Webpack Dev Server                       ║"
echo -e "║  • Hot Reload activé (modification → rechargement)    ║"
echo -e "║  • node_modules présent dans le dossier               ║"
echo -e "║  • Node.js installé sur l'OS Ubuntu                   ║"
echo -e "║  • Arrêt : Ctrl+C                                     ║"
echo -e "╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# Ouvrir le navigateur automatiquement (si disponible)
(sleep 3 && xdg-open http://localhost:3000 2>/dev/null || true) &

npm start
