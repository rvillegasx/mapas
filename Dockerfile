# mapas.appsmx.tech: app Angular (client/) + API y websockets (server/) en un solo contenedor.

# --- 1. Cliente Angular ---
FROM node:24-alpine AS client
WORKDIR /client
COPY client/package.json client/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY client/ ./
RUN npx ng build

# --- 2. Servidor (TypeScript) ---
FROM node:24-alpine AS server
WORKDIR /app
COPY server/package.json server/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY server/ ./
RUN npm run build

# --- 3. Producción ---
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY --from=server /app/dist ./dist
COPY --from=client /client/dist/mapas/browser ./public
EXPOSE 3000
CMD ["node", "dist/"]
