# 🐳 NetPulse — VERSION DOCKER

> Application React compilée en fichiers statiques et servie par **Nginx dans un conteneur Docker**.  
> Thème visuel **orange/rouge** pour la distinguer de la version classique.

---

## 📁 Structure des fichiers

```
netpulse-docker/
├── public/
│   └── index.html             ← Point d'entrée HTML
├── src/
│   ├── index.js               ← Montage React dans le DOM
│   ├── index.css              ← Reset CSS global
│   ├── App.js                 ← Composant principal (thème Docker)
│   └── App.css                ← Styles thème orange/rouge
├── Dockerfile                 ← Build multi-stage (Node → Nginx)
├── .dockerignore              ← Fichiers exclus du build
├── package.json               ← Dépendances npm
├── install-docker.sh          ← Installe Docker sur Ubuntu
└── build-and-run.sh           ← Build image + Lance conteneur
```

---

## 🚀 Lancement

### Étape 1 — Installer Docker (si pas déjà fait)
```bash
chmod +x install-docker.sh
./install-docker.sh
# Fermer et rouvrir le terminal (ou : newgrp docker)
```

### Étape 2 — Build + Lancer
```bash
chmod +x build-and-run.sh
./build-and-run.sh
```

**→ http://localhost:3000**

---

## 🏗️ Architecture du Dockerfile (multi-stage)

```
┌─────────────────────────────────────────────┐
│  STAGE 1 — builder (node:20-alpine)          │
│                                              │
│  COPY package.json                           │
│  RUN npm install        ← ~300 MB            │
│  COPY src/ public/                           │
│  RUN npm run build      → /app/build/        │
│                              │               │
└──────────────────────────────│───────────────┘
                               │ COPY --from=builder
┌──────────────────────────────▼───────────────┐
│  STAGE 2 — production (nginx:alpine)          │
│                                              │
│  /usr/share/nginx/html/  ← build statique    │
│  Port 80 EXPOSE                              │
│  HEALTHCHECK wget /                          │
│  CMD nginx -g "daemon off;"                  │
│                                              │
│  Image finale ≈ 25 MB  (sans node_modules!)  │
└──────────────────────────────────────────────┘
         │
         │ docker run -p 3000:80
         ▼
  http://localhost:3000
```

---

## 🐳 Commandes Docker

```bash
# Voir le conteneur en cours
docker ps

# Logs Nginx en temps réel
docker logs -f netpulse

# Stats CPU/RAM du conteneur
docker stats netpulse

# Entrer dans le conteneur (shell)
docker exec -it netpulse sh

# Arrêter le conteneur
docker stop netpulse

# Supprimer le conteneur
docker rm netpulse

# Voir les images
docker images netpulse-docker

# Inspecter l'image (layers, taille, etc.)
docker inspect netpulse-docker:latest

# Exporter l'image (partage)
docker save netpulse-docker:latest | gzip > netpulse-docker.tar.gz

# Importer l'image sur une autre machine
docker load < netpulse-docker.tar.gz
```

---

## ✅ Avantages / ❌ Inconvénients

| Avantage | Inconvénient |
|---|---|
| Node.js non nécessaire sur l'OS | Pas de hot reload |
| Image légère (~25 MB) | Rebuild nécessaire après changement |
| Isolation complète | Debugging moins direct |
| Portable sur toute machine Docker | Nécessite Docker installé |
| Nginx production (performant) | |
| Restart automatique | |

---

*ISET Sousse — Département Informatique — 2026*
