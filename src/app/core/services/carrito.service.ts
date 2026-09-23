import { computed, effect, Injectable, signal } from '@angular/core';
import { ItemCarrito } from '../../shared/models/pedido.model';
import { Producto } from '../../shared/models/producto.model';

const CLAVE = 'medicalshop.carrito';

@Injectable({ providedIn: 'root' })
export class CarritoService {
  readonly items = signal<ItemCarrito[]>(this.cargar());
  readonly total = computed(() =>
    this.items().reduce((suma, i) => suma + i.producto.precio * i.cantidad, 0),
  );
  readonly cantidadTotal = computed(() => this.items().reduce((s, i) => s + i.cantidad, 0));

  constructor() {
    effect(() => {
      try {
        localStorage.setItem(CLAVE, JSON.stringify(this.items()));
      } catch {
        // almacenamiento no disponible: el carrito solo vive en memoria
      }
    });
  }

  agregar(producto: Producto, cantidad = 1): void {
    this.items.update((items) => {
      const existente = items.find((i) => i.producto.id === producto.id);
      return existente
        ? items.map((i) => (i === existente ? { ...i, cantidad: i.cantidad + cantidad } : i))
        : [...items, { producto, cantidad }];
    });
  }

  cambiarCantidad(productoId: string, cantidad: number): void {
    if (cantidad < 1) return this.quitar(productoId);
    this.items.update((items) =>
      items.map((i) => (i.producto.id === productoId ? { ...i, cantidad } : i)),
    );
  }

  quitar(productoId: string): void {
    this.items.update((items) => items.filter((i) => i.producto.id !== productoId));
  }

  vaciar(): void {
    this.items.set([]);
  }

  private cargar(): ItemCarrito[] {
    try {
      return JSON.parse(localStorage.getItem(CLAVE) ?? '[]');
    } catch {
      return [];
    }
  }
}
