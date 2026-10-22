# Node 18 → 24 (mapas-server)

Fecha: 21-oct-2026. Parte del plan de actualización de Node de los servicios (Node 18/20 ya sin
soporte de seguridad). Primero de la lista: se usa poco y su despliegue era el más irregular.

## Qué cambia

- `server/Dockerfile`: `node:18-alpine` → `node:24-alpine` (las 2 etapas). Sin módulos nativos;
  `express`, `cors` y `socket.io` 2 funcionan igual.
- **La raíz `/` redirige a la app** (`https://maps.appsmx.tech`, configurable con `APP_URL`).
  Antes respondía «Cannot GET /» y `mapas.appsmx.tech` parecía caído.
- **`docker-compose.yml` en la raíz del repo**: Dokploy construye desde `server/Dockerfile`.
  Antes bajaba `rvillegasx/mapas-server:latest`, una imagen construida a mano el 19-feb-2026
  que no se reconstruía con los cambios del repo.

## Dónde vive cada parte

| Parte | Dirección | Dónde corre |
|---|---|---|
| App (Angular 7) | https://maps.appsmx.tech | estático detrás de Cloudflare (no cambia) |
| Servidor (API + socket.io) | https://mapas.appsmx.tech | Dokploy en Beta, `mapasserver-service-ssnwbz` |

El volumen `/home/rvillegas/mapas/server-data` (caché de geolocalización `geo-cache.json`) se
conserva.

## Verificado (21-oct, contenedor local)

Imagen nueva con Node `v24.22.1`: `/` → 302 a la app; `/health`, `/mapa`, `/usuarios` y el
handshake de socket.io → 200.

## Despliegue en Dokploy (una vez)

En el servicio **mapasserver-service-ssnwbz**:

1. **General → Provider:** GitHub, repo `rvillegasx/mapas`, rama `main`, *Compose Path*
   `./docker-compose.yml`. Encender **Autodeploy**.
2. **Domains:** conservar `mapas.appsmx.tech` → servicio `mapas-server`, puerto `3000`, HTTPS
   (Let's Encrypt). Dokploy agrega las etiquetas de Traefik; ya no van en el compose.
3. **Deploy.**
3b. **Webhook (una vez):** el repo no tiene webhook. Copiar la URL de deploy que muestra Dokploy;
   Hermes la crea en GitHub con el host público (`beta.appsmx.tech:3000`), igual que civisBOT.
4. Verificar:
   - `https://mapas.appsmx.tech/health` → `{"ok":true,...}`
   - `https://mapas.appsmx.tech/` redirige a la app.
   - En https://maps.appsmx.tech, el punto de conexión se ve verde.
   - `node -v` en el contenedor = v24.

**Rollback:** volver el provider a la imagen `rvillegasx/mapas-server:latest` (sigue en Beta) y Deploy.

## Actualización 22-oct-2026

Con el plan de Angular (`docs/ANGULAR_UPGRADE_PLAN.md`) la app ya no vive en maps.appsmx.tech:
el contenedor de mapas.appsmx.tech sirve la app, la API y los websockets. La redirección de `/` y
la variable `APP_URL` se quitaron; el `Dockerfile` está en la raíz del repo (antes `server/`).
