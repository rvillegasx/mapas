import { Socket } from 'socket.io';
import socketIO from 'socket.io';
import http from 'http';
import { Usuario } from '../classes/usuario';
import { usuariosConectados, mapa } from '../global/state';
import { GeoCache, GeoData } from '../classes/geo-cache';

const DEV_IP = '187.136.58.115';
const geoCache = new GeoCache();

const GEO_VACIO: GeoData = { ciudad: '', estado: '', pais: '', lat: 0, lon: 0, isp: '', mobile: false };

function obtenerUbicacion( ip: string ): Promise<GeoData> {

    // Buscar en cache local
    const cacheado = geoCache.buscar( ip );
    if ( cacheado ) {
        return Promise.resolve( cacheado );
    }

    // Consultar ip-api.com
    return new Promise(( resolve ) => {
        http.get(`http://ip-api.com/json/${ ip }?fields=city,regionName,countryCode,lat,lon,isp,mobile`, ( res ) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse( data );
                    const geo: GeoData = {
                        ciudad: json.city || '',
                        estado: json.regionName || '',
                        pais:   json.countryCode || '',
                        lat:    json.lat || 0,
                        lon:    json.lon || 0,
                        isp:    json.isp || '',
                        mobile: json.mobile || false
                    };
                    geoCache.guardar( ip, geo );
                    resolve( geo );
                } catch {
                    resolve( GEO_VACIO );
                }
            });
        }).on('error', () => {
            resolve( GEO_VACIO );
        });
    });
}

//Mapas
export const marcadorNuevo = ( cliente: Socket ) => {

    cliente.on('marcador-nuevo', (marcador) => {
        // console.log(marcador);
        mapa.agregarMarcador( marcador );
        cliente.broadcast.emit('marcador-nuevo', marcador);
    });

}

export const marcadorMover = ( cliente: Socket ) => {

    cliente.on('marcador-mover', (marcador) => {
        // console.log(marcador);
        mapa.moverMarcador( marcador );
        cliente.broadcast.emit('marcador-mover', marcador );
    });

}

export const marcadorBorrar = ( cliente: Socket, io: socketIO.Server ) => {

    cliente.on('marcador-borrar', (id: string) => {
        if (id !== '1') {
            mapa.borrarMarcador( id );
            io.emit('marcador-borrar', id );
        }
    });

}




//Graficas

export const conectarCliente = ( cliente: Socket, io: socketIO.Server ) => {

    const usuario = new Usuario( cliente.id );
    usuariosConectados.agregar( usuario );

    // Obtener IP del cliente (en dev usar IP hardcodeada)
    let ip = cliente.handshake.address || '';
    if ( ip === '127.0.0.1' || ip === '::1' || ip.includes('::ffff:127.0.0.1') ) {
        ip = DEV_IP;
    }

    obtenerUbicacion( ip ).then( geo => {
        usuario.ciudad = geo.ciudad;
        usuario.estado = geo.estado;
        usuario.pais   = geo.pais;
        usuario.lat    = geo.lat;
        usuario.lon    = geo.lon;
        usuario.isp    = geo.isp;
        usuario.mobile = geo.mobile;
        io.emit('usuarios-activos', usuariosConectados.getListaCompleta() );
    });

    io.emit('usuarios-activos', usuariosConectados.getListaCompleta() );

}


export const desconectar = ( cliente: Socket, io: socketIO.Server ) => {

    cliente.on('disconnect', () => {
        console.warn('.');

        usuariosConectados.borrarUsuario( cliente.id );

        io.emit('usuarios-activos', usuariosConectados.getListaCompleta() );

    });

}


// Escuchar mensajes
export const mensaje = ( cliente: Socket, io: socketIO.Server ) => {

    cliente.on('mensaje', (  payload: { de: string, cuerpo: string }  ) => {

        console.warn('Mensaje recibido', payload );

        io.emit('mensaje-nuevo', payload );

    });

}

// Configurar usuario
export const configurarUsuario = ( cliente: Socket, io: socketIO.Server ) => {

    cliente.on('configurar-usuario', (  payload: { nombre: string }, callback: Function  ) => {

        usuariosConectados.actualizarNombre( cliente.id, payload.nombre );

        io.emit('usuarios-activos', usuariosConectados.getListaCompleta() );

        if (typeof callback === 'function') {
            callback({
                ok: true,
                mensaje: `Usuario ${ payload.nombre }, configurado`
            });
        }
    });

}


// Obtener Usuarios
export const obtenerUsuarios = ( cliente: Socket, io: socketIO.Server ) => {

    cliente.on('obtener-usuarios', () => {

        io.to( cliente.id ).emit('usuarios-activos', usuariosConectados.getListaCompleta() );
        
    });

}
