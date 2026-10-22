import { Injectable, OnDestroy, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';

/**
 * Conexión Socket.io (v4) con el mismo servidor que sirve la app: sin URL configurada.
 * Antes usaba ngx-socket-io + Socket.io 2.
 */
@Injectable({ providedIn: 'root' })
export class WebsocketService implements OnDestroy {
  readonly socketStatus = signal(false);

  private readonly socket: Socket = io();

  constructor() {
    this.socket.on('connect', () => this.socketStatus.set(true));
    this.socket.on('disconnect', () => this.socketStatus.set(false));
  }

  emit(evento: string, payload?: unknown, callback?: (...args: unknown[]) => void): void {
    if (callback) {
      this.socket.emit(evento, payload, callback);
    } else {
      this.socket.emit(evento, payload);
    }
  }

  listen<T>(evento: string): Observable<T> {
    return new Observable<T>((subscriber) => {
      const handler = (data: T) => subscriber.next(data);
      this.socket.on(evento, handler);
      return () => this.socket.off(evento, handler);
    });
  }

  ngOnDestroy(): void {
    this.socket.disconnect();
  }
}
