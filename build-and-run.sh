#!/bin/bash
# ═══════════════════════════════════════════════════════════
#  NetPulse — VERSION DOCKER
#  Build de l'image + Lancement du conteneur
#  ISET Sousse — Cours Cloud & Réseaux Modernes
# ═══════════════════════════════════════════════════════════

set -e
GREEN='\033[0;32m'; BLUE='\033[0;34m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'

IMAGE_NAME="netpulse-docker"
CONTAINER_NAME="netpulse"
HOST_PORT=3000

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════╗"
echo "║   NetPulse — VERSION DOCKER                          ║"
echo "║   Build multi-stage + Démarrage Nginx                ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ─── Vérifier Docker ──────────────────────────────────────
if ! command -v docker &>/dev/null; then
    echo -e "${RED}✗ Docker non trouvé. Lancez d'abord : ./install-docker.sh${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker : $(docker --version)${NC}"

# ─── Nettoyage de l'ancien conteneur ─────────────────────
echo ""
echo -e "${YELLOW}[1/4] Nettoyage...${NC}"
if docker ps -aq -f name="^${CONTAINER_NAME}$" | grep -q .; then
    echo -e "  Arrêt et suppression du conteneur '$CONTAINER_NAME'..."
    docker stop "$CONTAINER_NAME" 2>/dev/null || true
    docker rm   "$CONTAINER_NAME" 2>/dev/null || true
    echo -e "${GREEN}  ✓ Ancien conteneur supprimé${NC}"
else
    echo -e "${GREEN}  ✓ Aucun ancien conteneur${NC}"
fi

# ─── Build de l'image ─────────────────────────────────────
echo ""
echo -e "${YELLOW}[2/4] Build de l'image Docker (multi-stage)...${NC}"
echo -e "  Stage 1 : node:20-alpine → npm run build"
echo -e "  Stage 2 : nginx:alpine  → serve static files"
echo ""

BUILD_START=$(date +%s)

docker build \
    --tag  "${IMAGE_NAME}:latest" \
    --tag  "${IMAGE_NAME}:1.0" \
    --file Dockerfile \
    --progress=plain \
    .

BUILD_END=$(date +%s)
BUILD_TIME=$((BUILD_END - BUILD_START))

echo ""
echo -e "${GREEN}  ✓ Image construite en ${BUILD_TIME}s${NC}"
echo ""
echo -e "${CYAN}  Détails de l'image :${NC}"
docker images "${IMAGE_NAME}" --format "  ID: {{.ID}}  |  Taille: {{.Size}}  |  Créée: {{.CreatedAt}}"

# ─── Lancement du conteneur ──────────────────────────────
echo ""
echo -e "${YELLOW}[3/4] Lancement du conteneur...${NC}"
docker run \
    --detach \
    --name  "$CONTAINER_NAME" \
    --publish "${HOST_PORT}:80" \
    --restart unless-stopped \
    "${IMAGE_NAME}:latest"

echo -e "${GREEN}  ✓ Conteneur '$CONTAINER_NAME' démarré${NC}"

# ─── Vérification ────────────────────────────────────────
echo ""
echo -e "${YELLOW}[4/4] Vérification...${NC}"
sleep 2

# Attendre que Nginx soit prêt
for i in 1 2 3; do
    if curl -sf http://localhost:${HOST_PORT} > /dev/null 2>&1; then
        echo -e "${GREEN}  ✓ Nginx répond sur le port ${HOST_PORT}${NC}"
        break
    fi
    sleep 1
done

echo ""
docker ps --filter "name=$CONTAINER_NAME" \
    --format "  ID: {{.ID}}  |  Status: {{.Status}}  |  Port: {{.Ports}}"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗"
echo -e "║  ✓  Conteneur lancé avec succès !                    ║"
echo -e "╠══════════════════════════════════════════════════════╣"
echo -e "║  🌐  http://localhost:${HOST_PORT}                          ║"
echo -e "╠══════════════════════════════════════════════════════╣"
echo -e "║  CARACTÉRISTIQUES VERSION DOCKER :                    ║"
echo -e "║  • Serveur : Nginx Alpine (production)                ║"
echo -e "║  • Node.js NON installé sur l'OS                      ║"
echo -e "║  • node_modules NON présent sur le disque             ║"
echo -e "║  • Isolation complète via namespace Linux              ║"
echo -e "║  • Redémarrage automatique (--restart unless-stopped) ║"
echo -e "╠══════════════════════════════════════════════════════╣"
echo -e "║  Commandes utiles :                                   ║"
echo -e "║    docker logs -f ${CONTAINER_NAME}                          ║"
echo -e "║    docker stats  ${CONTAINER_NAME}                          ║"
echo -e "║    docker exec -it ${CONTAINER_NAME} sh                     ║"
echo -e "║    docker stop   ${CONTAINER_NAME}                          ║"
echo -e "╚══════════════════════════════════════════════════════╝${NC}"

# Ouvrir le navigateur
(sleep 2 && xdg-open http://localhost:${HOST_PORT} 2>/dev/null || true) &
