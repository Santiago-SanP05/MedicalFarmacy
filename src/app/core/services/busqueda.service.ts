import { Injectable, signal } from '@angular/core';

/** Texto de búsqueda del catálogo, compartido entre el navbar (donde se escribe) y Catalogo. */
@Injectable({ providedIn: 'root' })
export class BusquedaService {
  readonly texto = signal('');
}
