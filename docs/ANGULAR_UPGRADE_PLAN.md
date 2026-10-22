# Plan: Angular 7 → 22 y la app servida desde mapas.appsmx.tech

Fecha: 22-oct-2026. Estado: **aprobado (22-oct-2026), sin ejecutar.**

## Objetivo

1. Actualizar el cliente (`client/`) de **Angular 7.2** a **Angular 22** (el mismo que civis.mx).
2. Servir la app desde **https://mapas.appsmx.tech**, junto con la API y los websockets que ya
   corren ahí. Un solo dominio, un solo servicio en Dokploy, un solo despliegue por merge.
3. **Dejar de publicar en Cloudflare**: `maps.appsmx.tech` deja de existir y queda solo
   `mapas.appsmx.tech`.

## Situación actual

| Pieza | Dónde | Notas |
|---|---|---|
| Código fuente del cliente | `mapas/client` | Angular 7.2, TypeScript 3.2, RxJS 6.3, `ngx-socket-io` 2, TSLint, Karma/Protractor. Requiere Node 10 para compilar. Último cambio: 7-may-2026. |
| App publicada | `maps.appsmx.tech` (Cloudflare Pages) | Archivos compilados; copia en el repo `maps-web` (respaldo del 15-sep, sin código fuente). |
| Backend | `mapas.appsmx.tech` (Beta, Dokploy `mapasserver-service-ssnwbz`) | Express 4 + Socket.io **2.2**, Node 24. `/` redirige (302) a maps.appsmx.tech. |
| Configuración del cliente | `client/src/environments/` | **No está en git** (`.gitignore`); solo existe en la Mac. Trae `serverUrl` y la llave de Google Maps. |

La app es chica: un componente de mapa (196 líneas), el servicio de websocket y el panel de
sesiones conectadas. Por eso conviene **re-crear el cliente con Angular 22** y copiar el código, en
vez de subir versión por versión (7 → 8 → … → 22 son 15 saltos de `ng update`).

## Decisiones propuestas

1. **Cliente nuevo con Angular 22**: componentes standalone, `@angular/build` (esbuild),
   `@types/google.maps` (el paquete `@types/googlemaps` está obsoleto). Se quita TSLint, Karma y
   Protractor; pruebas con el runner por defecto de Angular 22.
2. **Socket.io 2 → 4 en ambos lados.** `ngx-socket-io` 2 no funciona con Angular 22 y el cliente de
   Socket.io 4 no habla con un servidor 2. Se usa `socket.io-client` 4 directo en el
   `WebsocketService` (un archivo; sin `ngx-socket-io`) y el servidor sube a `socket.io` 4.
   Cliente y servidor se despliegan juntos, así que no hay periodo de versiones mezcladas.
3. **Un solo contenedor**: el `Dockerfile` compila el cliente (etapa 1), el servidor (etapa 2) y
   la imagen final sirve el cliente con `express.static` + fallback a `index.html`. `/` deja de
   redirigir. API (`/mapa`, `/usuarios`, `/health`…) y websockets no cambian de ruta.
4. **Mismo origen**: el cliente usa rutas relativas (`/mapa`, socket en el mismo host), así que ya
   no necesita `serverUrl` ni CORS abierto (`origin: true` se puede cerrar).
5. **Se reutiliza la llave actual de Google Maps** (la misma que hoy va en la app publicada) y no
   va en git: Dokploy la pasa como variable (`GOOGLE_MAPS_API_KEY`) y el servidor la entrega en
   `/config.js`. Roberto no recuerda cómo la configuró; si tiene restricción por dominio a
   `maps.appsmx.tech`, el mapa fallaría en `mapas.appsmx.tech` (`RefererNotAllowedMapError` en la
   consola). Se revisa en el paso 4; solo si falla hay que entrar a Google Cloud a agregar el dominio.
6. **Bootstrap** sigue por CDN (4.1.3) en esta etapa; cambiarlo no es parte del objetivo.

## Pasos (un PR por paso)

| # | Qué | Dónde | Riesgo | Tiempo |
|---|---|---|---|---|
| 1 | **Este plan** (solo docs). | `mapas` | nulo (el merge redespliega mapas-server ~10 s) | — |
| 2 | **Cliente Angular 22**: re-crear `client/`, portar mapa, sesiones y websocket a `socket.io-client` 4; environments fuera de git reemplazados por rutas relativas + llave por variable. Probado en local contra un servidor de prueba. | `mapas` | medio | 3–4 h |
| 3 | **Servidor**: Socket.io 4, `express.static` del cliente, `/` sirve la app, endpoint de config para la llave, Dockerfile de 3 etapas. Va **junto con el paso 2 en el mismo PR** si se prefiere un solo despliegue (recomendado: cliente y servidor de socket deben cambiar juntos). | `mapas` | medio | 1–2 h |
| 4 | **Despliegue en Beta**: Roberto agrega `GOOGLE_MAPS_API_KEY` en Dokploy y mergea. Verificar en `https://mapas.appsmx.tech`: carga la app, punto verde, marcadores en vivo entre dos navegadores, panel de sesiones con ubicación, `/health`. | Dokploy | medio | 30 min |
| 5 | **Google Cloud (solo si el mapa falla en el paso 4)**: agregar `https://mapas.appsmx.tech/*` a las restricciones de la llave. | consola Google (Roberto) | bajo | 10 min |
| 6 | **Borrar Cloudflare de una vez** (sin periodo de redirección): borrar el proyecto de Pages y el registro DNS de `maps.appsmx.tech`; archivar el repo `maps-web`. Se hace en cuanto el paso 4 quede verificado. | Cloudflare / GitHub (Roberto) | bajo | 15 min |
| 7 | **Docs**: README/CLAUDE.md (ya no se necesita Node 10; comandos nuevos), `docs/NODE_UPGRADE.md` al día, quitar la variable `APP_URL`. | `mapas` | nulo | 30 min |

Orden recomendado: 1 → (2+3 en un PR) → 4 → 5 → 6 → 7.

## Verificación antes del merge (paso 2+3)

- `ng build` sin errores en Node 24; tamaño del bundle comparado con el actual.
- Imagen Docker compila; en un contenedor local: `/` sirve la app, `/health` 200, `/mapa` 200,
  socket conecta (Socket.io 4), crear/mover/borrar marcador se ve en un segundo navegador.
- La caché de geolocalización (`/app/dist/data/geo-cache.json`, volumen
  `/home/rvillegas/mapas/server-data`) se conserva.

## Rollback

- Antes del paso 6: revertir el PR → vuelve el servidor Socket.io 2 y la app de Cloudflare sigue
  funcionando (maps.appsmx.tech aún publicado).
- Después del paso 6 ya no hay copia publicada: revertir el PR deja `mapas.appsmx.tech` solo con
  la API. Si hiciera falta, la app vieja está compilada en el repo `maps-web` (archivado, no borrado).

## Decisiones de Roberto (22-oct-2026)

1. `maps.appsmx.tech` **se borra de una vez**, sin periodo de redirección (paso 6).
2. Se mantiene el aspecto actual tal cual; cambios visuales en otro PR.
3. Se reutiliza la llave actual de Google Maps; solo se toca Google Cloud si falla en el paso 4.
