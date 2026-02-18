import express from 'express';
import { SERVER_PORT } from '../global/environment';
import socketIO from 'socket.io';
import http from 'http';
import https from 'https';   // para cuando se usa con ssl

import * as socket from '../sockets/socket';

import fs from 'fs';

const SSL_PATH = '/etc/letsencrypt/live/api.appsmx.tech';

export default class Server {

    private static _instance: Server;

    public app: express.Application;
    public port: number;

    public io: socketIO.Server;

    private httpServer: http.Server | undefined;  // para cuando se usa normal
    private httpsServer: https.Server | undefined;  // para cuando se usa con ssl

    private constructor() {
        this.app = express();
        this.port = SERVER_PORT;

        const sslDisponible = fs.existsSync(`${ SSL_PATH }/privkey.pem`)
                           && fs.existsSync(`${ SSL_PATH }/cert.pem`)
                           && fs.existsSync(`${ SSL_PATH }/chain.pem`);

        if ( sslDisponible ) {
            this.httpsServer = new https.Server({
                key: fs.readFileSync(`${ SSL_PATH }/privkey.pem`),
                cert: fs.readFileSync(`${ SSL_PATH }/cert.pem`),
                ca: fs.readFileSync(`${ SSL_PATH }/chain.pem`),
                requestCert: false,
                rejectUnauthorized: false
            }, this.app );  // para cuando se usa con ssl
            this.io = socketIO( this.httpsServer );
        } else {
            this.httpServer = new http.Server(this.app);  // para cuando se usa normal
            this.io = socketIO( this.httpServer );
        }

        this.escucharSockets();
    }

    public static get instance() {
        return this._instance || ( this._instance = new this() );
    }

    start(callback: any) {
        if (this.httpsServer) {
            this.httpsServer.listen( this.port, callback );
        } else if (this.httpServer) {
            this.httpServer.listen( this.port, callback );
        }
    }

    private escucharSockets() {

        console.warn('Escuchando conexiones - sockets');

        this.io.on('connection', cliente => {

            // Mapas
            socket.marcadorNuevo( cliente );
            socket.marcadorBorrar( cliente, this.io );
            socket.marcadorMover( cliente );

            // Conectar cliente
            socket.conectarCliente( cliente, this.io );

            // Configurar usuario
            socket.configurarUsuario( cliente, this.io );

            // Obtener usuarios activos
            socket.obtenerUsuarios( cliente, this.io );

            // Mensajes
            socket.mensaje( cliente, this.io );

            // Desconectar
            socket.desconectar( cliente, this.io );    
            

        });

    }

}