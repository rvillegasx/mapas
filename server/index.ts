import Server from './classes/server';
import router from './routes/router';
import { SERVER_PORT } from './global/environment';
import express from 'express';
import cors from 'cors';

const server = Server.instance;

// Body parsing (built-in Express middleware)
server.app.use( express.urlencoded({ extended: true }) );
server.app.use( express.json() );

// CORS
server.app.use( cors({ origin: true, credentials: true  }) );

// pongo el objeto publico io, como referible en las rutas
server.app.set('socketio', server.io);

// Rutas de servicios
server.app.use('/', router );

server.start( () => {
    console.warn(`Servidor corriendo en puerto ${SERVER_PORT}`);
});


