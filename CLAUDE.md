# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This is a monorepo with two directories:

- `client/` — Angular 22 frontend (standalone components, signals)
- `server/` — Node.js/Express/Socket.io backend

## Commands

### Client

All Angular commands must be run from the `client/` directory.

**Node version:** Node 24 for both client and server.

```bash
cd client
npm start        # ng serve at http://localhost:4200; proxies API + socket.io to localhost:3000
npm run build    # Production build (output: client/dist/mapas/browser/)
```


### Server

All server commands must be run from the `server/` directory:

```bash
cd server
npm run build    # Compile TypeScript (tsc) → server/dist/
npm start        # Run server (node dist/) on port 3000
npm run dev      # Compile in watch mode (tsc -w)
```

The server port defaults to `3000` and can be overridden with the `PORT` environment variable.

## Architecture

This is a real-time collaborative Google Maps app built with **Angular 22** and **Socket.io 4**, served from a single container at https://mapas.appsmx.tech (app + REST API + websockets on the same origin).

### Data Flow

1. User interacts with the map (click to add, drag to move, double-click to delete markers)
2. `MapaComponent` handles the interaction and emits a WebSocket event via `WebsocketService`
3. The backend broadcasts the event to all connected clients via Socket.io
4. All clients receive the event and update their local map state

### Key Files — Client

- `client/src/app/mapa/mapa.ts` — Main feature component; Google Maps lifecycle, markers, WebSocket events, connected sessions (signals), user name
- `client/src/app/mapa/mapa.html` / `mapa.css` — Template (`@for`/`@if` control flow) and styles (unchanged from the Angular 7 version)
- `client/src/app/services/websocket.ts` — Wraps `socket.io-client` 4 (`io()` = same origin); `emit()`, `listen<T>()` (Observable), `socketStatus` signal
- `client/src/app/interfaces/lugar.ts`, `usuario.ts` — Marker and connected-user types
- `client/proxy.conf.json` — Dev proxy for `ng serve`
- No `environments/`: the client uses relative URLs; the Google Maps key comes from `/config.js` (server)

### Key Files — Server

- `server/index.ts` — Entry point; Express middleware (JSON, CORS), API routes, then serves the compiled Angular app from `public/` (`CLIENT_DIR`) with `index.html` at `/`
- `server/classes/server.ts` — Singleton `Server` class; creates Express app, HTTP/HTTPS server, and Socket.io instance; registers all socket event handlers
- `server/routes/router.ts` — REST endpoints (`/mapa`, `/grafica`, `/usuarios`, `/mensajes/:id`, `/health`)
- `server/sockets/socket.ts` — Socket.io event handlers for markers, users, messages, and IP geolocation on connect
- `server/global/state.ts` — Shared singleton instances of `Mapa` and `UsuariosLista`; holds seed marker data; imported by both `router.ts` and `socket.ts` to avoid circular dependencies
- `server/classes/mapa.ts` — `Mapa` class; in-memory CRUD for markers
- `server/classes/marcador.ts` — `Marcador` class: `{ id, nombre, lat, lng }`
- `server/classes/usuario.ts` — `Usuario` class: `{ id, nombre, sala, ciudad, estado, pais, lat, lon, isp, mobile }`
- `server/classes/usuarios-lista.ts` — `UsuariosLista` class; manages connected users list (add, remove, update, filter by room); `getLista()` returns named users only, `getListaCompleta()` returns all including anonymous
- `server/classes/geo-cache.ts` — `GeoCache` class; JSON-file-based cache for IP geolocation lookups; avoids redundant calls to ip-api.com; persists to `server/dist/data/geo-cache.json`
- `server/classes/grafica.ts` — `GraficaData` class; manages chart values for real-time voting
- `server/global/environment.ts` — Exports `SERVER_PORT` from `process.env.PORT` or defaults to `3000`

### WebSocket Events

| Event | Direction | Description |
|---|---|---|
| `marcador-nuevo` | emit & listen | Add new marker |
| `marcador-mover` | emit & listen | Move marker |
| `marcador-borrar` | emit & listen | Delete marker |
| `configurar-usuario` | emit | Set user name; server responds via callback |
| `obtener-usuarios` | emit | Request active users list |
| `usuarios-activos` | listen | Receive updated active users list |
| `mensaje` | emit | Send public message |
| `mensaje-nuevo` | listen | Receive broadcasted public message |
| `mensaje-privado` | listen | Receive private message |

### REST Endpoints

| Method | Route | Description |
|---|---|---|
| GET | `/mapa` | Get all markers |
| GET | `/grafica` | Get chart data |
| POST | `/grafica` | Increment chart value (`{ opcion, unidades }`) |
| GET | `/usuarios` | Get connected client IDs |
| GET | `/usuarios/detalle` | Get all connected users (including anonymous) with geolocation |
| POST | `/mensajes/:id` | Send private message to user (`{ de, cuerpo }`) |
| GET | `/health` | Health check; returns `{ ok: true, status: 'running' }` |
| GET | `/config.js` | `window.MAPAS_CONFIG = { googleMapsApiKey }` from env `GOOGLE_MAPS_API_KEY` |
| GET | `/` | The Angular app (`index.html`) |

### Configuration

- `GOOGLE_MAPS_API_KEY` (server env, set in Dokploy) → served to the browser via `/config.js`. Not stored in git. The key is public by nature; protect it with an HTTP-referrer restriction in Google Cloud.
- `PORT` (default 3000), `CLIENT_DIR` (default `dist/../public`).

### Connection Status Indicator

A small dot in the top-right corner of the map reflects the WebSocket connection state:
- **Red** — disconnected from backend
- **Green** — connected to backend

Driven by `WebsocketService.socketStatus` (updated on `connect`/`disconnect` socket events). No additional logic required in the component — Angular's class binding `[class.connected]="wsService.socketStatus()"` handles the toggle.

### Connected Sessions Panel

Below the map, the app displays all connected sessions in real time:
- Each session shows a name (or "Anonimo" if not configured) and geolocation (city, state, country)
- The initial list is fetched via HTTP GET `/usuarios/detalle` to avoid WebSocket timing issues
- Real-time updates arrive via the `usuarios-activos` WebSocket event
- Users can set their display name via an input field that emits `configurar-usuario`
- An explicit "OK" button is provided next to the input for mobile users (no Enter key)

### Mobile Responsiveness

The client UI is optimized for mobile devices:

- **Map height**: Uses `70vh` (viewport-relative) with `min-height: 250px` / `max-height: 600px` instead of a fixed pixel height
- **Touch targets**: All interactive elements (input, buttons, session cards, modal close) have a minimum touch area of 44px (Apple/Google recommended minimum)
- **touch-action**: The map container uses `touch-action: none` to prevent gesture conflicts with page scrolling
- **Text overflow**: Session card names and locations use `text-overflow: ellipsis` to prevent layout breaking on narrow screens
- **Modal**: Map height uses `50vh` with min/max constraints; close button has a 44x44px touch area
- **Mobile breakpoint** (`@media max-width: 576px`): Title font shrinks, name input stacks vertically, session cards go full-width, modal gets wider margins
- **Layout**: Body uses `container-fluid` (full-width on mobile) with `max-width: 1140px` and `margin: auto` to preserve the centered layout on desktop. `overflow-x: hidden` prevents horizontal scroll caused by map elements
- **Name input**: The input wrapper has `max-width: 350px` to keep it compact on desktop

### IP Geolocation

When a client connects, the server resolves their IP address to a geographic location using `ip-api.com` (free, no API key required). The geolocation data is cached locally in a JSON file (`server/dist/data/geo-cache.json`) to avoid redundant API calls. Fields stored: `ciudad`, `estado`, `pais`, `lat`, `lon`, `isp`, `mobile`.

In development, local IPs (`127.0.0.1`, `::1`) are replaced with a hardcoded IP (`187.136.58.115`) defined as `DEV_IP` in `server/sockets/socket.ts`.

### Favicon

The app uses an inline SVG data URI in `index.html` to display a globe emoji (🌍) as the favicon. The default Angular `favicon.ico` has been removed and is not listed in the `assets` array of `angular.json`. Do not re-add `src/favicon.ico` to avoid overriding the inline icon in production builds.

### Google Maps

The Maps API script is loaded dynamically in `MapaComponent.ngOnInit()` via a `<script>` tag appended to `document.head`. The API key comes from `window.MAPAS_CONFIG.googleMapsApiKey` (`/config.js`). Types are provided by `@types/google.maps`. The map is initialized after the script loads.

### SSL/HTTPS

The `Server` class in `server/classes/server.ts` checks if SSL certificate files exist at `/etc/letsencrypt/live/api.appsmx.tech/` to decide between HTTP (development) and HTTPS (production with Let's Encrypt certificates).

### Docker / Deploy

- Root `Dockerfile` — 3 stages: build client (`ng build`), build server (`tsc`), runtime image with the server + `public/` (client).
- Root `docker-compose.yml` — used by Dokploy (`mapasserver-service-ssnwbz`, autodeploy on push to `main`). Bind mount `/home/rvillegas/mapas/server-data` → `/app/dist/data` keeps `geo-cache.json`.
- TLS is terminated by Traefik (Dokploy); the `SSL_PATH` branch in `server/classes/server.ts` is legacy and unused in Beta.

