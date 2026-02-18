import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Lugar } from '../interfaces/lugar';
import { HttpClient } from '@angular/common/http';
import { WebsocketService } from '../services/websocket.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-mapa',
  templateUrl: './mapa.component.html',
  styleUrls: ['./mapa.component.css']
})
export class MapaComponent implements OnInit {

  @ViewChild('map') mapaElement: ElementRef;
  map: google.maps.Map;

  marcadores: google.maps.Marker[] = [];
  infoWindows: google.maps.InfoWindow[] = [];

  lugares: Lugar[] = [];
  usuarios: Array<{ id: string, nombre: string, ciudad: string, estado: string, pais: string }> = [];
  miNombre = 'Anónimo';

  constructor(private http: HttpClient,
              public wsService: WebsocketService) { }

  ngOnInit() {
    this.escucharUsuarios();

    this.cargarScript().then(() => {
      this.http.get(`${environment.serverUrl}/mapa`)
          .subscribe( (lugares: Lugar[]) => {
            this.lugares = lugares;
            this.cargarMapa();
          });

      this.escucharSockets();
    });
  }

  private cargarScript(): Promise<void> {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}`;
      script.onload = () => resolve();
      document.head.appendChild(script);
    });
  }

  escucharSockets() {
    // marcador-nuevo
    this.wsService.listen('marcador-nuevo')
        .subscribe( (marcador: Lugar) => {
          this.agregarMarcador( marcador );
        });
    // marcador-mover
    this.wsService.listen('marcador-mover')
        .subscribe((marcador: Lugar) => {
          for ( const i in this.marcadores ) {
            if (this.marcadores[i].getTitle() === marcador.id) {
              const latLng = new google.maps.LatLng( marcador.lat, marcador.lng);
              this.marcadores[i].setPosition( latLng );
              break;
            }
          }
        });


    // marcador-borrar
    this.wsService.listen('marcador-borrar')
        .subscribe( (id: string) => {
          for ( const i in this.marcadores ) {
            if (this.marcadores[i].getTitle() === id) {
              this.marcadores[i].setMap( null );
              break;
            }
          }
        });

  }

  cambiarNombre() {
    const nombre = this.miNombre.trim();
    if ( nombre.length === 0 ) { return; }
    this.wsService.emit('configurar-usuario', { nombre });
  }

  escucharUsuarios() {
    // Carga inicial por HTTP (no depende del timing del socket)
    this.http.get<{ ok: boolean, clientes: Array<{ id: string, nombre: string, ciudad: string, estado: string, pais: string }> }>(`${environment.serverUrl}/usuarios/detalle`)
        .subscribe( resp => {
          this.usuarios = resp.clientes;
        });

    // Actualizaciones en tiempo real por WebSocket
    this.wsService.listen('usuarios-activos')
        .subscribe( (usuarios: Array<{ id: string, nombre: string, ciudad: string, estado: string, pais: string }>) => {
          this.usuarios = usuarios;
        });
  }

  cargarMapa() {
    const latLng = new google.maps.LatLng(37.784679, -122.395936);
    const mapaOpciones: google.maps.MapOptions = {
      center: latLng,
      zoom: 13,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    this.map = new google.maps.Map(this.mapaElement.nativeElement, mapaOpciones);

    this.map.addListener('click', (coors) => {
      const nuevoMarcador: Lugar = {
        nombre: 'Nuevo Lugar',
        lat: coors.latLng.lat(),
        lng: coors.latLng.lng(),
        id: new Date().toISOString()
      };
      this.agregarMarcador( nuevoMarcador );
      // Emitir evento de socket, agregar marcador
      this.wsService.emit('marcador-nuevo', nuevoMarcador );
    });

    for ( const lugar of this.lugares ) {
      this.agregarMarcador(lugar);
    }
  }

  agregarMarcador( marcador: Lugar) {
    const latLng = new google.maps.LatLng(marcador.lat, marcador.lng);
    const marker = new google.maps.Marker({
      map: this.map,
      animation: google.maps.Animation.DROP,
      position: latLng,
      draggable: true,
      title: marcador.id
    });

    this.marcadores.push(marker);

    const contenido = `<b>${ marcador.nombre }</b>`;
    const infoWindow = new google.maps.InfoWindow({
      content: contenido
    });

    this.infoWindows.push( infoWindow );

    google.maps.event.addDomListener( marker, 'click', () => {
      this.infoWindows.forEach( infoW => infoW.close() );
      infoWindow.open(this.map, marker );
    });

    google.maps.event.addDomListener( marker, 'dblclick', (coors) => {
      this.wsService.emit('marcador-borrar', marcador.id );
    });

    google.maps.event.addDomListener( marker, 'drag', (coors: any) => {
      const nuevoMarcador = {
        lat: coors.latLng.lat(),
        lng: coors.latLng.lng(),
        nombre: marcador.nombre,
        id: marcador.id
      };
      // console.log(nuevoMarcador);
      // disparar un evento de socket para mover el marker
      this.wsService.emit('marcador-mover', nuevoMarcador);
    });
  }
}
