

export class Usuario {

    public id: string;
    public nombre: string;
    public sala: string;
    public ciudad: string;
    public estado: string;
    public pais: string;
    public lat: number;
    public lon: number;
    public isp: string;
    public mobile: boolean;

    constructor( id: string ) {

        this.id = id;
        this.nombre = 'sin-nombre';
        this.sala   = 'sin-sala';
        this.ciudad = '';
        this.estado = '';
        this.pais   = '';
        this.lat    = 0;
        this.lon    = 0;
        this.isp    = '';
        this.mobile = false;

    }

}