import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { ProductoService } from '../../../../core/services/producto.service';
import { ProductoImagen } from '../../../../shared/components/producto-imagen/producto-imagen';
import { Producto } from '../../../../shared/models/producto.model';
import { normalizar } from '../../../../shared/utils/texto';

@Component({
  selector: 'app-listado-productos',
  imports: [RouterLink, CurrencyPipe, ProductoImagen],
  templateUrl: './listado-productos.html',
  styleUrl: './listado-productos.scss',
})
export class ListadoProductos implements OnInit {
  private readonly productoService = inject(ProductoService);
  protected readonly moneda = environment.moneda;

  protected readonly productos = signal<Producto[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly busqueda = signal('');
  protected readonly accionEnCurso = signal<string | null>(null);
  protected readonly errorAccion = signal<string | null>(null);

  protected readonly visibles = computed(() => {
    const consulta = normalizar(this.busqueda().trim());
    if (!consulta) return this.productos();
    return this.productos().filter((p) =>
      normalizar(`${p.nombre} ${p.descripcion ?? ''}`).includes(consulta),
    );
  });

  ngOnInit(): void {
    this.cargar();
  }

  protected async cargar(silencioso = false): Promise<void> {
    if (!silencioso) this.cargando.set(true);
    this.error.set(null);
    try {
      this.productos.set(await this.productoService.listarTodos());
    } catch {
      this.error.set('No se pudieron cargar los productos. Intenta de nuevo.');
    } finally {
      this.cargando.set(false);
    }
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
