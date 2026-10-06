import { CurrencyPipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { ProductoService } from '../../../../core/services/producto.service';
import { ProductoImagen } from '../../../../shared/components/producto-imagen/producto-imagen';
import { Etiqueta, ETIQUETAS, Producto } from '../../../../shared/models/producto.model';
import { dentroDeRangoPrecio, parsePrecio } from '../../../../shared/utils/rango-precio';
import { normalizar } from '../../../../shared/utils/texto';

type FiltroStock = 'todos' | 'faltantes';

@Component({
  selector: 'app-listado-productos',
  imports: [RouterLink, CurrencyPipe, ProductoImagen],
  templateUrl: './listado-productos.html',
  styleUrl: './listado-productos.scss',
})
export class ListadoProductos implements OnInit {
  private readonly productoService = inject(ProductoService);
  protected readonly moneda = environment.moneda;
  protected readonly etiquetasDisponibles = ETIQUETAS;

  protected readonly productos = signal<Producto[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly busqueda = signal('');
  protected readonly filtroStock = signal<FiltroStock>('todos');
  protected readonly filtroEtiquetas = signal<Etiqueta[]>([]);
  protected readonly filtroMarca = signal('todas');
  protected readonly precioMin = signal('');
  protected readonly precioMax = signal('');
  protected readonly accionEnCurso = signal<string | null>(null);
  protected readonly errorAccion = signal<string | null>(null);

  protected readonly conteoFaltantes = computed(
    () => this.productos().filter((p) => p.cantidad < 0).length,
  );

  /** Marcas presentes entre los productos, para armar el filtro sin mantenerlas a mano. */
  protected readonly marcasDisponibles = computed(() => {
    const marcas = new Set(
      this.productos()
        .map((p) => p.marca?.trim())
        .filter((m): m is string => !!m),
    );
    return Array.from(marcas).sort((a, b) => a.localeCompare(b));
  });

  /**
   * Valor del inventario a precio de costo (sin la fórmula del precio al público).
   * Solo cuenta productos con stock positivo: los que están en falta no restan del total.
   */
  protected readonly valorInventarioCosto = computed(() =>
    this.productos()
      .filter((p) => p.cantidad > 0)
      .reduce((suma, p) => suma + p.cantidad * p.precio, 0),
  );

  protected readonly modalDatosAbierto = signal(false);

  protected readonly mostrarAvisoFaltantes = signal(false);
  protected readonly cerrandoAviso = signal(false);
  private avisoTimeoutMostrar: ReturnType<typeof setTimeout> | null = null;
  private avisoTimeoutOcultar: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      if (this.avisoTimeoutMostrar) clearTimeout(this.avisoTimeoutMostrar);
      if (this.avisoTimeoutOcultar) clearTimeout(this.avisoTimeoutOcultar);
    });
  }

  protected readonly visibles = computed(() => {
    const consulta = normalizar(this.busqueda().trim());
    const soloFaltantes = this.filtroStock() === 'faltantes';
    const etiquetas = this.filtroEtiquetas();
    const marca = this.filtroMarca();
    const min = parsePrecio(this.precioMin());
    const max = parsePrecio(this.precioMax());

    return this.productos().filter((p) => {
      if (soloFaltantes && p.cantidad >= 0) return false;
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

  protected async cargar(silencioso = false): Promise<void> {
    if (!silencioso) this.cargando.set(true);
    this.error.set(null);
    try {
      this.productos.set(await this.productoService.listarTodos());
      this.mostrarAvisoTemporal();
    } catch {
      this.error.set('No se pudo cargar el inventario. Intenta de nuevo.');
    } finally {
      this.cargando.set(false);
    }
  }

  private mostrarAvisoTemporal(): void {
    if (this.avisoTimeoutMostrar) clearTimeout(this.avisoTimeoutMostrar);
    if (this.avisoTimeoutOcultar) clearTimeout(this.avisoTimeoutOcultar);

    if (this.conteoFaltantes() === 0) {
      this.mostrarAvisoFaltantes.set(false);
      this.cerrandoAviso.set(false);
      return;
    }

    this.cerrandoAviso.set(false);
    this.mostrarAvisoFaltantes.set(true);

    this.avisoTimeoutMostrar = setTimeout(() => {
      this.cerrandoAviso.set(true);
      this.avisoTimeoutOcultar = setTimeout(() => {
        this.mostrarAvisoFaltantes.set(false);
        this.cerrandoAviso.set(false);
      }, 300);
    }, 1500);
  }

  protected alternarFiltroEtiqueta(valor: Etiqueta): void {
    this.filtroEtiquetas.update((actuales) =>
      actuales.includes(valor) ? actuales.filter((e) => e !== valor) : [...actuales, valor],
    );
  }

  protected async cambiarEstado(producto: Producto): Promise<void> {
    if (
      producto.activo &&
      !confirm(
        `¿Desactivar "${producto.nombre}"? Dejará de verse en el catálogo, pero los pedidos ya generados no se afectan.`,
      )
    ) {
      return;
    }

    this.accionEnCurso.set(producto.id);
    this.errorAccion.set(null);
    try {
      await this.productoService.actualizar(producto.id, { activo: !producto.activo });
      await this.cargar(true);
    } catch {
      this.errorAccion.set('No se pudo actualizar el producto. Intenta de nuevo.');
    } finally {
      this.accionEnCurso.set(null);
    }
  }
}
