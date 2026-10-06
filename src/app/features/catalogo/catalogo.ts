import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { CarritoService } from '../../core/services/carrito.service';
import { ProductoService } from '../../core/services/producto.service';
import { CantidadStepper } from '../../shared/components/cantidad-stepper/cantidad-stepper';
import { ProductoImagen } from '../../shared/components/producto-imagen/producto-imagen';
import { Etiqueta, ETIQUETAS, Producto } from '../../shared/models/producto.model';
import { dentroDeRangoPrecio, parsePrecio } from '../../shared/utils/rango-precio';
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
  protected readonly etiquetasDisponibles = ETIQUETAS;

  protected readonly productos = signal<Producto[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly busqueda = signal('');
  protected readonly filtroEtiquetas = signal<Etiqueta[]>([]);
  protected readonly filtroMarca = signal('todas');
  protected readonly precioMin = signal('');
  protected readonly precioMax = signal('');

  /** Marcas presentes en el catálogo, para armar el filtro sin mantenerlas a mano. */
  protected readonly marcasDisponibles = computed(() => {
    const marcas = new Set(
      this.productos()
        .map((p) => p.marca?.trim())
        .filter((m): m is string => !!m),
    );
    return Array.from(marcas).sort((a, b) => a.localeCompare(b));
  });

  protected readonly filtrados = computed(() => {
    const consulta = normalizar(this.busqueda().trim());
    const etiquetas = this.filtroEtiquetas();
    const marca = this.filtroMarca();
    const min = parsePrecio(this.precioMin());
    const max = parsePrecio(this.precioMax());

    return this.productos().filter((p) => {
      if (etiquetas.length > 0 && !etiquetas.every((e) => p.etiquetas.includes(e))) return false;
      if (marca !== 'todas' && p.marca !== marca) return false;
      if (!dentroDeRangoPrecio(p.precio_final, min, max)) return false;
      if (!consulta) return true;
      return normalizar(
        `${p.nombre} ${p.descripcion ?? ''} ${p.marca ?? ''} ${p.principio_activo ?? ''}`,
      ).includes(consulta);
    });
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

  protected alternarFiltroEtiqueta(valor: Etiqueta): void {
    this.filtroEtiquetas.update((actuales) =>
      actuales.includes(valor) ? actuales.filter((e) => e !== valor) : [...actuales, valor],
    );
  }
}
