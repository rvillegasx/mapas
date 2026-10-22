import {
  Component, DestroyRef, ElementRef, HostListener, Injector, OnInit,
  afterNextRender, inject, signal, viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Lugar } from '../interfaces/lugar';
import { Usuario } from '../interfaces/usuario';
import { WebsocketService } from '../services/websocket';

declare global {
  interface Window { MAPAS_CONFIG?: { googleMapsApiKey?: string } }
}

@Component({
  selector: 'app-mapa',
  imports: [FormsModule],
  templateUrl: './mapa.html',
  styleUrl: './mapa.css',
})
export class Mapa implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  readonly wsService = inject(WebsocketService);

  private readonly mapaElement = viewChild.required<ElementRef<HTMLDivElement>>('map');
  private readonly mapModalElement = viewChild<ElementRef<HTMLDivElement>>('mapModal');

  map!: google.maps.Map;
  marcadores: google.maps.Marker[] = [];
  infoWindows: google.maps.InfoWindow[] = [];
  lugares: Lugar[] = [];

  readonly usuarios = signal<Usuario[]>([]);
  readonly usuarioSeleccionado = signal<Usuario | null>(null);
  miNombre = 'Anonymous';

  @HostListener('document:keydown.escape')
  onEscape() { this.cerrarModal(); }

  ngOnInit() {
    this.escucharUsuarios();

    this.cargarScript().then(() => {
      this.http.get<Lugar[]>('mapa').subscribe((lugares) => {
        this.lugares = lugares;
        this.cargarMapa();
      });
      this.escucharSockets();
    });
  }

  private cargarScript(): Promise<void> {
    return new Promise((resolve) => {
      const key = window.MAPAS_CONFIG?.googleMapsApiKey ?? '';
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}`;
      script.onload = () => resolve();
      document.head.appendChild(script);
    });
  }

  escucharSockets() {
    this.wsService.listen<Lugar>('marcador-nuevo')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((marcador) => this.agregarMarcador(marcador));

    this.wsService.listen<Lugar>('marcador-mover')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((marcador) => {
        const m = this.marcadores.find((x) => x.getTitle() === marcador.id);
        m?.setPosition(new google.maps.LatLng(marcador.lat, marcador.lng));
      });

    this.wsService.listen<string>('marcador-borrar')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((id) => {
        const m = this.marcadores.find((x) => x.getTitle() === id);
        m?.setMap(null);
      });
  }

  nombreVisible(u: Usuario): string {
    return u.nombre === 'sin-nombre' ? 'Anonymous' : u.nombre;
  }

  abrirModalUbicacion(usuario: Usuario) {
    if (!usuario.lat && !usuario.lon) { return; }
    this.usuarioSeleccionado.set(usuario);
    // Espera a que el modal esté en el DOM para dibujar el mapa dentro.
    afterNextRender(() => {
      const el = this.mapModalElement();
      if (!el) { return; }
      const latLng = new google.maps.LatLng(usuario.lat, usuario.lon);
      const modalMap = new google.maps.Map(el.nativeElement, {
        center: latLng,
        zoom: 12,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
      });
      const marker = new google.maps.Marker({ map: modalMap, position: latLng });
      const infoWindow = new google.maps.InfoWindow({ content: `<b>${this.nombreVisible(usuario)}</b>` });
      infoWindow.open(modalMap, marker);
    }, { injector: this.injector });
  }

  cerrarModal() {
    this.usuarioSeleccionado.set(null);
  }

  cambiarNombre() {
    const nombre = this.miNombre.trim();
    if (nombre.length === 0) { return; }
    this.wsService.emit('configurar-usuario', { nombre });
  }

  escucharUsuarios() {
    // Carga inicial por HTTP (no depende del timing del socket)
    this.http.get<{ ok: boolean, clientes: Usuario[] }>('usuarios/detalle')
      .subscribe((resp) => this.usuarios.set(resp.clientes));

    // Actualizaciones en tiempo real por WebSocket
    this.wsService.listen<Usuario[]>('usuarios-activos')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((usuarios) => this.usuarios.set(usuarios));
  }

  cargarMapa() {
    const latLng = new google.maps.LatLng(37.784679, -122.395936);
    this.map = new google.maps.Map(this.mapaElement().nativeElement, {
      center: latLng,
      zoom: 13,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
    });

    this.map.addListener('click', (coors: google.maps.MapMouseEvent) => {
      if (!coors.latLng) { return; }
      const nuevoMarcador: Lugar = {
        nombre: 'Nuevo Lugar',
        lat: coors.latLng.lat(),
        lng: coors.latLng.lng(),
        id: new Date().toISOString(),
      };
      this.agregarMarcador(nuevoMarcador);
      this.wsService.emit('marcador-nuevo', nuevoMarcador);
    });

    for (const lugar of this.lugares) {
      this.agregarMarcador(lugar);
    }
  }

  agregarMarcador(marcador: Lugar) {
    const marker = new google.maps.Marker({
      map: this.map,
      animation: google.maps.Animation.DROP,
      position: new google.maps.LatLng(marcador.lat, marcador.lng),
      draggable: true,
      title: marcador.id,
    });
    this.marcadores.push(marker);

    const infoWindow = new google.maps.InfoWindow({ content: `<b>${marcador.nombre}</b>` });
    this.infoWindows.push(infoWindow);

    marker.addListener('click', () => {
      this.infoWindows.forEach((infoW) => infoW.close());
      infoWindow.open(this.map, marker);
    });

    marker.addListener('dblclick', () => {
      this.wsService.emit('marcador-borrar', marcador.id);
    });

    marker.addListener('drag', (coors: google.maps.MapMouseEvent) => {
      if (!coors.latLng) { return; }
      this.wsService.emit('marcador-mover', {
        lat: coors.latLng.lat(),
        lng: coors.latLng.lng(),
        nombre: marcador.nombre,
        id: marcador.id,
      });
    });
  }
}
