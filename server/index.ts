import Server from './classes/server';
import router from './routes/router';
import { SERVER_PORT } from './global/environment';
import express from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';

const server = Server.instance;

// Body parsing (built-in Express middleware)
server.app.use( express.urlencoded({ extended: true }) );
server.app.use( express.json() );

// CORS: se conserva por si algún otro cliente usa la API (/grafica, /mensajes).
server.app.use( cors({ origin: true, credentials: true  }) );

// pongo el objeto publico io, como referible en las rutas
server.app.set('socketio', server.io);

// Rutas de servicios (API): /mapa, /usuarios, /grafica, /config.js, /health...
server.app.use('/', router );

// App Angular (client/), compilada en la imagen. Misma URL que la API y los
// websockets: ya no hace falta CORS ni configurar la URL del servidor en el cliente.
const CLIENT_DIR = process.env.CLIENT_DIR || path.join( __dirname, '..', 'public' );
const INDEX_HTML = path.join( CLIENT_DIR, 'index.html' );

if ( fs.existsSync( INDEX_HTML ) ) {
    // Los archivos con hash se pueden cachear mucho; index.html nunca.
    server.app.use( express.static( CLIENT_DIR, {
        index: false,
        setHeaders: ( res: express.Response, file: string ) => {
            if ( /-[A-Z0-9]{8}\.(js|css)$/.test( file ) ) {
                res.setHeader( 'Cache-Control', 'public, max-age=31536000, immutable' );
            }
        }
    }) );
    server.app.get( '/', ( req, res ) => {
        res.set( 'Cache-Control', 'no-cache' ).sendFile( INDEX_HTML );
    });
} else {
    console.warn(`App no encontrada en ${ CLIENT_DIR } (solo API).`);
}

server.start( () => {
    console.warn(`Servidor corriendo en puerto ${ SERVER_PORT }`);
});
