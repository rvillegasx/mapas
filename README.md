# Mapas

Aplicacion colaborativa de Google Maps en tiempo real. Multiples usuarios pueden agregar, mover y eliminar marcadores en un mapa compartido. Los cambios se sincronizan instantaneamente entre todos los clientes conectados mediante WebSockets.

## Stack

| Capa | Tecnologia |
|------|------------|
| Frontend | Angular 7.2, Google Maps JS API |
| Backend | Node.js, Express 4, Socket.io 2 |
| Comunicacion | WebSockets (Socket.io) + REST |

## Estructura del proyecto

```
mapas/
├── client/          ← Angular frontend
│   ├── src/
│   ├── e2e/
│   ├── angular.json
│   └── package.json
└── server/          ← Node.js backend (Express + Socket.io)
    ├── classes/     ← Modelos (Server, Usuario, Mapa, Marcador, Grafica)
    ├── routes/      ← Endpoints REST
    ├── sockets/     ← Handlers de eventos WebSocket
    ├── global/      ← Configuracion (puerto, environment)
    └── package.json
```

## Prerequisitos

- **Node.js 8.9.4** (recomendado via nvm)

```bash
nvm install 8.9.4
nvm use 8.9.4
```

## Ejecucion local

Se necesitan **dos terminales** para correr cliente y servidor simultaneamente.

### Terminal 1 — Server (puerto 3000)

```bash
cd server
npm install
npm run build
npm start
```

Para desarrollo con recompilacion automatica, en lugar de `build` + `start`:

```bash
npm run dev        # compila en modo watch (tsc -w)
# en otra terminal:
npm start          # node dist/
```

El servidor queda disponible en `http://localhost:3000`.

### Terminal 2 — Client (puerto 4200)

```bash
cd client
npm install
npm start
```

El cliente queda disponible en `http://localhost:4200`.

> **Nota:** El cliente se conecta al backend via WebSocket. La URL del servidor esta configurada en `client/src/environments/environment.ts`. Verifica que apunte a `http://localhost:3000` para desarrollo local.

## Eventos WebSocket

| Evento | Direccion | Descripcion |
|--------|-----------|-------------|
| `marcador-nuevo` | emit & listen | Agregar marcador |
| `marcador-mover` | emit & listen | Mover marcador |
| `marcador-borrar` | emit & listen | Eliminar marcador |

## Endpoints REST

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/mapa` | Obtener todos los marcadores |
| GET | `/grafica` | Obtener datos de grafica |
| POST | `/grafica` | Incrementar valores de grafica |
| GET | `/usuarios` | IDs de clientes conectados |
| GET | `/usuarios/detalle` | Lista de usuarios con nombre |
| POST | `/mensajes/:id` | Enviar mensaje privado a un usuario |

## Scripts disponibles

### Client (`cd client`)

| Comando | Descripcion |
|---------|-------------|
| `npm start` | Dev server con hot reload |
| `npm test` | Unit tests (Karma/Jasmine) |
| `npm run build` | Build de produccion |
| `npm run lint` | TSLint |
| `npm run e2e` | Tests E2E (Protractor) |

### Server (`cd server`)

| Comando | Descripcion |
|---------|-------------|
| `npm run build` | Compilar TypeScript |
| `npm start` | Ejecutar servidor |
| `npm run dev` | Compilar en modo watch |
