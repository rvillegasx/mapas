import fs from 'fs';
import path from 'path';

export interface GeoData {
    ciudad: string;
    estado: string;
    pais: string;
    lat: number;
    lon: number;
    isp: string;
    mobile: boolean;
}

const CACHE_PATH = path.join( __dirname, '..', 'data', 'geo-cache.json' );

export class GeoCache {

    private cache: { [ip: string]: GeoData } = {};

    constructor() {
        this.cargar();
    }

    private cargar() {
        try {
            if ( fs.existsSync( CACHE_PATH ) ) {
                const contenido = fs.readFileSync( CACHE_PATH, 'utf-8' );
                this.cache = JSON.parse( contenido );
            }
        } catch {
            this.cache = {};
        }
    }

    private persistir() {
        try {
            const dir = path.dirname( CACHE_PATH );
            if ( !fs.existsSync( dir ) ) {
                fs.mkdirSync( dir, { recursive: true } );
            }
            fs.writeFileSync( CACHE_PATH, JSON.stringify( this.cache, null, 2 ), 'utf-8' );
        } catch ( err ) {
            console.error( 'Error al persistir geo-cache:', err );
        }
    }

    public buscar( ip: string ): GeoData | null {
        return this.cache[ ip ] || null;
    }

    public guardar( ip: string, datos: GeoData ) {
        this.cache[ ip ] = datos;
        this.persistir();
    }

}
