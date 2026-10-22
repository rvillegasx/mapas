import { Component } from '@angular/core';
import { Mapa } from './mapa/mapa';

@Component({
  selector: 'app-root',
  imports: [Mapa],
  template: '<app-mapa />',
})
export class App {}
