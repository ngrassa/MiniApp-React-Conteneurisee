### 🐳 Version Conteneurisée — avec Docker
```
Ta machine Ubuntu
│
└── Docker Engine
     │
     └── Image netpulse-dashboard:latest
          │
          ├── STAGE 1 (builder) : node:20-alpine
          │    └── npm run build  → /app/build/ (fichiers statiques)
          │
          └── STAGE 2 (production) : nginx:alpine
               └── /usr/share/nginx/html/  ← copie du build
                         │
                         ▼
                   Nginx écoute :80
                         │
                         ▼ (port mapping)
               http://localhost:3000  ← via Docker
```


```bash
# Build and RUN manuellement :
docker build -t netpulse-dashboard .
docker run -d --name netpulse -p 3000:80 netpulse-dashboard
```
```bash
cd MiniApp-Docker
chmod +x install-docker.sh && ./install-docker.sh --si besoin
chmod +x build-and-run.sh  && ./build-and-run.sh
```
# → http://localhost:3000
```
#Structure du projet avec Docker
netpulse-docker/
│
├── install-docker.sh          # Installe Docker CE sur Ubuntu
├── build-and-run.sh          # Build l'image + lance le conteneur
├── Dockerfile                # Build multi-stage Node → Nginx
├── .dockerignore             # Exclut node_modules du build
├── package.json              # Dépendances React
│
├── public/
│   └── index.html            # HTML de base
│
└── src/
    ├── index.js              # Point d'entrée React
    ├── index.css             # Reset CSS global
    ├── App.js                # Dashboard Docker (thème orange/rouge)
    └── App.css               # Tous les styles

```
