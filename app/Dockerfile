# Dockerfile — App CatálogoCloud (multi-stage build)
# ─────────────────────────────────────────────────────────────────────────────
# IMPORTANTE: NUNCA copies credenciales en esta imagen.
# Las variables de entorno se inyectan en tiempo de ejecución (docker run -e o ECS/EC2).
#
# Para la defensa: "Uso multi-stage build para que la imagen final no incluya
# devDependencies ni herramientas de build, reduciendo la superficie de ataque
# y el tamaño de la imagen. El usuario no-root sigue el principio de mínimo privilegio."
# ─────────────────────────────────────────────────────────────────────────────

# ══ ETAPA 1: instalar solo dependencias de producción ═════════════════════════
FROM node:20-alpine AS deps

WORKDIR /app

# Copiar solo los manifests primero → Docker cachea esta capa
# Si el código cambia pero package.json no, npm ci no se re-ejecuta.
COPY package.json package-lock.json* ./

RUN npm ci --omit=dev && npm cache clean --force

# ══ ETAPA 2: imagen final liviana ═════════════════════════════════════════════
FROM node:20-alpine AS runner

LABEL org.opencontainers.image.title="CatálogoCloud" \
      org.opencontainers.image.description="App ABM de productos — ISW-341 Computación en la Nube" \
      org.opencontainers.image.authors="ISW-341"

WORKDIR /app

# Crear usuario no-root (principio de mínimo privilegio)
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copiar node_modules de la etapa anterior (solo producción, sin devDependencies)
COPY --from=deps /app/node_modules ./node_modules

# Copiar el código fuente
COPY . .

# Crear directorio de uploads y asignar permisos al usuario no-root
RUN mkdir -p uploads && chown -R appuser:appgroup /app

# Cambiar a usuario no-root
USER appuser

# Puerto que expone la app
EXPOSE 3000

# Variable de entorno de producción (las credenciales de BD se inyectan en runtime)
ENV NODE_ENV=production \
    PORT=3000

# Healthcheck interno del contenedor
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
