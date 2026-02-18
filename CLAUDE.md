# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This is a monorepo with two directories:

- `client/` — Angular 7.2 frontend
- `server/` — Node.js/Express/Socket.io backend

## Commands

### Client

All Angular commands must be run from the `client/` directory:

```bash
cd client
npm start        # Dev server at http://localhost:4200
npm test         # Karma/Jasmine unit tests
npm run build    # Production build (output: client/dist/)
npm run lint     # TSLint
npm run e2e      # Protractor E2E tests
```

To run a single test file, use the Angular CLI directly:
```bash
cd client
npx ng test --include='**/mapa.component.spec.ts'
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

This is a real-time collaborative Google Maps app built with **Angular 7.2** and **Socket.io**.

### Data Flow

1. User interacts with the map (click to add, drag to move, double-click to delete markers)
2. `MapaComponent` handles the interaction and emits a WebSocket event via `WebsocketService`
3. The backend broadcasts the event to all connected clients via Socket.io
4. All clients receive the event and update their local map state

### Key Files — Client

- `client/src/app/mapa/mapa.component.ts` — Main feature component; manages Google Maps lifecycle, marker state, user interactions, and WebSocket event handling
- `client/src/app/services/websocket.service.ts` — Singleton service wrapping `ngx-socket-io`; exposes `emit()` and `listen()` helpers
- `client/src/app/interfaces/lugar.ts` — `Lugar` interface: `{ id?, nombre, lat, lng }`

### Key Files — Server

- `server/index.ts` — Entry point; configures Express middleware (JSON, CORS), mounts routes, and starts the server
- `server/classes/server.ts` — Singleton `Server` class; creates Express app, HTTP/HTTPS server, and Socket.io instance; registers all socket event handlers
- `server/routes/router.ts` — REST endpoints (`/mapa`, `/grafica`, `/usuarios`, `/mensajes/:id`); also holds seed marker data
- `server/sockets/socket.ts` — Socket.io event handlers for markers, users, and messages; manages `UsuariosLista` instance
- `server/classes/mapa.ts` — `Mapa` class; in-memory CRUD for markers
- `server/classes/marcador.ts` — `Marcador` class: `{ id, nombre, lat, lng }`
- `server/classes/usuario.ts` — `Usuario` class: `{ id, nombre, sala }`
- `server/classes/usuarios-lista.ts` — `UsuariosLista` class; manages connected users list (add, remove, update, filter by room)
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
| GET | `/usuarios/detalle` | Get connected users with names |
| POST | `/mensajes/:id` | Send private message to user (`{ de, cuerpo }`) |

### Google Maps

The Maps API script is loaded directly in `client/src/index.html` with a hardcoded API key. Types are provided by `@types/googlemaps`. The map is initialized inside `MapaComponent.ngAfterViewInit()`.

### SSL/HTTPS

The `Server` class in `server/classes/server.ts` detects the hostname to decide between HTTP (development) and HTTPS (production with Let's Encrypt certificates at `/etc/letsencrypt/live/api.bulkmatic.tech/`).

## Linting Rules (client/tslint.json)

- Max line length: 140 characters
- Single quotes required
- `console.log` is disallowed; use `console.warn` or `console.error`
- No non-null assertions (`!` operator)
- Angular lifecycle interfaces must be declared explicitly
