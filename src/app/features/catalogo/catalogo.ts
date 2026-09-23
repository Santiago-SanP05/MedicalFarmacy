import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { CarritoService } from '../../core/services/carrito.service';
import { ProductoService } from '../../core/services/producto.service';
import { CantidadStepper } from '../../shared/components/cantidad-stepper/cantidad-stepper';
import { ProductoImagen } from '../../shared/components/producto-imagen/producto-imagen';
import { Producto } from '../../shared/models/producto.model';
import { normalizar } from '../../shared/utils/texto';

@Component({
  selector: 'app-catalogo',
  imports: [RouterLink, CurrencyPipe, CantidadStepper, ProductoImagen],
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.scss',
})
export class Catalogo implements OnInit {
  private readonly productoService = inject(ProductoService);
  protected readonly carrito = inject(CarritoService);
  protected readonly moneda = environment.moneda;

  protected readonly productos = signal<Producto[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly busqueda = signal('');

  protected readonly filtrados = computed(() => {
    const consulta = normalizar(this.busqueda().trim());
    if (!consulta) return this.productos();
    return this.productos().filter((p) =>
      normalizar(`${p.nombre} ${p.descripcion ?? ''}`).includes(consulta),
    );
  });

  ngOnInit(): void {
    this.cargar();
  }

  protected async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.productos.set(await this.productoService.listarActivos());
    } catch {
      this.error.set('No se pudo cargar el catálogo. Intenta de nuevo.');
    } finally {
      this.cargando.set(false);
    }
  }

  protected cantidadEn(productoId: string): number {
    return this.carrito.items().find((i) => i.producto.id === productoId)?.cantidad ?? 0;
  }
}
