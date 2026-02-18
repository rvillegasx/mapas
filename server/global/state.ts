import { UsuariosLista } from '../classes/usuarios-lista';
import { Mapa } from '../classes/mapa';

export const usuariosConectados = new UsuariosLista();

export const mapa = new Mapa();

const lugares = [
    {
      id: '1',
      nombre: 'Udemy',
      lat: 37.784679,
      lng: -122.395936
    },
    {
      id: '2',
      nombre: 'Bahía de San Francisco',
      lat: 37.798933,
      lng: -122.377732
    },
    {
      id: '3',
      nombre: 'The Palace Hotel',
      lat: 37.788578,
      lng: -122.401745
    }
];

lugares.forEach(lugar => mapa.agregarMarcador(lugar));
