
import { Router, Request, Response } from 'express';
import Server from '../classes/server';
import { usuariosConectados, mapa } from '../global/state';
import { GraficaData } from '../classes/grafica';

const router = Router();

router.get('/mapa', ( req: Request, res: Response  ) => {

    res.json( mapa.getMarcadores() );

});

// Grafica
const grafica = new GraficaData();


router.get('/grafica', ( req: Request, res: Response  ) => {

    res.json( grafica.getDataGrafica() );

});

router.post('/grafica', ( req: Request, res: Response  ) => {

    const opcion   = Number( req.body.opcion );
    const unidades = Number( req.body.unidades );

    if ( isNaN(opcion) || isNaN(unidades) ) {
        return res.status(400).json({ ok: false, mensaje: 'opcion y unidades deben ser números válidos' });
    }

    grafica.incrementarValor( opcion, unidades );

    const server = Server.instance;
    server.io.emit('cambio-grafica', grafica.getDataGrafica() );


    res.json( grafica.getDataGrafica() );

});


router.post('/mensajes/:id', ( req: Request, res: Response  ) => {

    const cuerpo = req.body.cuerpo;
    const de     = req.body.de;
    const id     = req.params.id;

    const payload = {
        de,
        cuerpo
    }


    const server = Server.instance;

    server.io.in( id ).emit( 'mensaje-privado', payload );


    res.json({
        ok: true,
        cuerpo,
        de,
        id
    });

});


// Servicio para obtener todos los IDs de los usuarios
router.get('/usuarios', (  req: Request, res: Response ) => {

    const server = Server.instance;

    server.io.allSockets()
        .then( ids => res.json({ ok: true, clientes: [ ...ids ] }) )
        .catch( err => res.status(500).json({ ok: false, err: String( err ) }) );

});

// Obtener usuarios y sus nombres
router.get('/usuarios/detalle', (  req: Request, res: Response ) => {


    res.json({
        ok: true,
        clientes: usuariosConectados.getListaCompleta()
    });

    
});




// Configuración del cliente: la llave de Google Maps viene de la variable
// GOOGLE_MAPS_API_KEY (Dokploy) y no se guarda en git. Es pública por naturaleza
// (el navegador la usa), su protección es la restricción por dominio en Google Cloud.
router.get('/config.js', ( req: Request, res: Response ) => {
    const config = { googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '' };
    res.type('application/javascript')
       .set('Cache-Control', 'no-store')
       .send( `window.MAPAS_CONFIG = ${ JSON.stringify( config ) };` );
});

// Health check
router.get('/health', ( req: Request, res: Response ) => {
    res.json({ ok: true, status: 'running' });
});

export default router;


