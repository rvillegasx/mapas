# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This is a monorepo with two directories:

- `client/` — Angular 7.2 frontend
- `server/` — Node.js backend (placeholder)

## Commands

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

## Architecture

This is a real-time collaborative Google Maps app built with **Angular 7.2** and **Socket.io**.

### Data Flow

1. User interacts with the map (click to add, drag to move, double-click to delete markers)
2. `MapaComponent` handles the interaction and emits a WebSocket event via `WebsocketService`
3. The backend at `https://api.bulkmatic.tech:3000` broadcasts the event to all connected clients
4. All clients receive the event and update their local map state

### Key Files

- `client/src/app/mapa/mapa.component.ts` — Main feature component; manages Google Maps lifecycle, marker state, user interactions, and WebSocket event handling
- `client/src/app/services/websocket.service.ts` — Singleton service wrapping `ngx-socket-io`; exposes `emit()` and `listen()` helpers
- `client/src/app/interfaces/lugar.ts` — `Lugar` interface: `{ id?, nombre, lat, lng }`

### WebSocket Events

| Event | Direction | Description |
|---|---|---|
| `marcador-nuevo` | emit & listen | Add new marker |
| `marcador-mover` | emit & listen | Move marker |
| `marcador-borrar` | emit & listen | Delete marker |

### Google Maps

The Maps API script is loaded directly in `client/src/index.html` with a hardcoded API key. Types are provided by `@types/googlemaps`. The map is initialized inside `MapaComponent.ngAfterViewInit()`.

## Linting Rules (client/tslint.json)

- Max line length: 140 characters
- Single quotes required
- `console.log` is disallowed; use `console.warn` or `console.error`
- No non-null assertions (`!` operator)
- Angular lifecycle interfaces must be declared explicitly
