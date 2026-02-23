#!/bin/bash
# ═══════════════════════════════════════════════════════════
#  Installation de Docker CE sur Ubuntu
#  NetPulse — Version Docker
#  ISET Sousse — Cours Cloud & Réseaux Modernes
# ═══════════════════════════════════════════════════════════

set -e
GREEN='\033[0;32m'; BLUE='\033[0;34m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════╗"
echo "║   Installation Docker CE — Ubuntu                    ║"
echo "║   Prérequis pour la version conteneurisée            ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ─── Vérifier si Docker est déjà installé ─────────────────
if command -v docker &>/dev/null; then
    echo -e "${GREEN}✓ Docker déjà installé : $(docker --version)${NC}"
    echo -e "${GREEN}✓ Prêt à utiliser ./build-and-run.sh${NC}"
    exit 0
fi

echo -e "${YELLOW}[1/5] Mise à jour du système...${NC}"
sudo apt-get update -y

echo -e "${YELLOW}[2/5] Installation des dépendances...${NC}"
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

echo -e "${YELLOW}[3/5] Ajout du dépôt officiel Docker...${NC}"
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
    sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

echo -e "${YELLOW}[4/5] Installation de Docker CE...${NC}"
sudo apt-get update -y
sudo apt-get install -y \
    docker-ce \
    docker-ce-cli \
    containerd.io \
    docker-buildx-plugin \
    docker-compose-plugin

echo -e "${YELLOW}[5/5] Configuration des permissions...${NC}"
sudo usermod -aG docker $USER
sudo systemctl enable docker
sudo systemctl start docker

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗"
echo -e "║  ✓ Docker CE installé avec succès !                  ║"
echo -e "╠══════════════════════════════════════════════════════╣"
echo -e "║  Version : $(docker --version | cut -d' ' -f3 | tr -d ',')                             ║"
echo -e "╠══════════════════════════════════════════════════════╣"
echo -e "║  ⚠ IMPORTANT : Fermez et rouvrez votre terminal      ║"
echo -e "║    (ou lancez : newgrp docker)                       ║"
echo -e "║    pour utiliser Docker sans sudo.                   ║"
echo -e "╠══════════════════════════════════════════════════════╣"
echo -e "║  Ensuite lancez : ./build-and-run.sh                 ║"
echo -e "╚══════════════════════════════════════════════════════╝${NC}"
