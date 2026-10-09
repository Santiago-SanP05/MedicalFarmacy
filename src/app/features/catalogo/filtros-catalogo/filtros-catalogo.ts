import { Component, computed, ElementRef, inject, input, model, signal } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { Etiqueta, ETIQUETAS } from '../../../shared/models/producto.model';
import { parsePrecio } from '../../../shared/utils/rango-precio';

type Panel = 'marca' | 'precio';

const formato = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: environment.moneda,
  maximumFractionDigits: 0,
});

@Component({
  selector: 'app-filtros-catalogo',
  templateUrl: './filtros-catalogo.html',
  styleUrl: './filtros-catalogo.scss',
  host: {
    '(document:click)': 'alClicFuera($event)',
    '(document:keydown.escape)': 'cerrar()',
  },
})
export class FiltrosCatalogo {
  readonly marcas = input.required<string[]>();
  readonly marca = model.required<string>();
  readonly etiquetas = model.required<Etiqueta[]>();
  readonly precioMin = model.required<string>();
  readonly precioMax = model.required<string>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly etiquetasDisponibles = ETIQUETAS;
  protected readonly abierto = signal<Panel | null>(null);

  protected readonly textoMarca = computed(() =>
    this.marca() === 'todas' ? 'Todas las marcas' : this.marca(),
  );

  protected readonly precioActivo = computed(
    () => parsePrecio(this.precioMin()) !== null || parsePrecio(this.precioMax()) !== null,
  );

  protected readonly textoPrecio = computed(() => {
    const min = parsePrecio(this.precioMin());
    const max = parsePrecio(this.precioMax());
    if (min !== null && max !== null) return `${formato.format(min)} – ${formato.format(max)}`;
    if (min !== null) return `Desde ${formato.format(min)}`;
    if (max !== null) return `Hasta ${formato.format(max)}`;
    return 'Precio';
  });

  protected alternarPanel(panel: Panel): void {
    this.abierto.update((actual) => (actual === panel ? null : panel));
  }

  protected cerrar(): void {
    this.abierto.set(null);
  }

  protected alClicFuera(evento: MouseEvent): void {
    if (!this.host.nativeElement.contains(evento.target as Node)) this.cerrar();
  }

  protected elegirMarca(valor: string): void {
    this.marca.set(valor);
    this.cerrar();
  }

  protected alternarEtiqueta(valor: Etiqueta): void {
    this.etiquetas.update((actuales) =>
      actuales.includes(valor) ? actuales.filter((e) => e !== valor) : [...actuales, valor],
    );
  }

  protected limpiarPrecio(): void {
    this.precioMin.set('');
    this.precioMax.set('');
  }
}
