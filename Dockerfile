# ═══════════════════════════════════════════════════════════
#  Dockerfile — NetPulse Dashboard (Version Docker)
#  Build multi-stage : Node.js 18 → Nginx Alpine
#  ISET Sousse — Cours Cloud & Réseaux Modernes 2026
# ═══════════════════════════════════════════════════════════

# ──────────────────────────────────────────────────────────
#  STAGE 1 : BUILD
# ──────────────────────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json ./

# Installer toutes les dépendances
RUN npm install --legacy-peer-deps

# Corriger le conflit ajv : remplacer la vieille ajv v6 par ajv v8
# dans le dossier exact utilisé par ajv-keywords → schema-utils → webpack
RUN npm install ajv@^8.0.0 ajv-keywords@^5.0.0 --legacy-peer-deps

COPY public/ ./public/
COPY src/     ./src/

ENV DISABLE_ESLINT_PLUGIN=true
ENV GENERATE_SOURCEMAP=false

RUN npm run build

# ──────────────────────────────────────────────────────────
#  STAGE 2 : PRODUCTION (Nginx Alpine)
# ──────────────────────────────────────────────────────────
FROM nginx:alpine AS production

LABEL maintainer="Nordine — ISET Sousse"
LABEL description="NetPulse Dashboard — Nginx Conteneur"
LABEL version="1.0"

RUN rm -rf /usr/share/nginx/html/*

COPY --from=builder /app/build /usr/share/nginx/html

RUN printf 'server {\n\
    listen 80;\n\
    server_name _;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
    location ~* \.(js|css|png|jpg|ico|woff2)$ {\n\
        expires 1y;\n\
        add_header Cache-Control "public, immutable";\n\
    }\n\
    gzip on;\n\
    gzip_types text/plain text/css application/javascript application/json;\n\
    gzip_min_length 256;\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
