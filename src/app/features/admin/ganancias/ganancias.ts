import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { GananciaService } from '../../../core/services/ganancia.service';
import { GraficoGanancias } from '../../../shared/components/grafico-ganancias/grafico-ganancias';
import { PuntoGrafico, ResumenGanancias } from '../../../shared/models/ganancia.model';

type Vista = 'tarjetas' | 'graficos';
type Periodo = 'diario' | 'mensual';

const CLAVE_VISTA = 'medicalshop.ganancias.vista';

@Component({
  selector: 'app-ganancias',
  imports: [CurrencyPipe, DecimalPipe, GraficoGanancias],
  templateUrl: './ganancias.html',
  styleUrl: './ganancias.scss',
})
export class Ganancias implements OnInit {
  private readonly gananciaService = inject(GananciaService);
  protected readonly moneda = environment.moneda;

  protected readonly resumen = signal<ResumenGanancias | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly vista = signal<Vista>(this.cargarVistaGuardada());
  protected readonly periodo = signal<Periodo>('diario');
  protected readonly serie = signal<PuntoGrafico[]>([]);
  protected readonly cargandoSerie = signal(false);
  protected readonly errorSerie = signal<string | null>(null);

  protected readonly totalSerie = computed(() => {
    const datos = this.serie();
    return {
      ventas: datos.reduce((suma, d) => suma + d.ventas, 0),
      ganancia: datos.reduce((suma, d) => suma + d.ganancia, 0),
    };
  });

  protected margen(ventas: number, ganancia: number): number {
    return ventas > 0 ? (ganancia / ventas) * 100 : 0;
  }

  ngOnInit(): void {
    this.cargar();
    if (this.vista() === 'graficos') {
      this.cargarSerie();
    }
  }

  protected async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.resumen.set(await this.gananciaService.obtenerResumen());
    } catch {
      this.error.set('No se pudieron cargar las ganancias. Intenta de nuevo.');
    } finally {
      this.cargando.set(false);
    }
  }

  protected cambiarVista(vista: Vista): void {
    this.vista.set(vista);
    try {
      localStorage.setItem(CLAVE_VISTA, vista);
    } catch {
      // preferencia no persistida: la app sigue funcionando igual en esta sesión
    }
    if (vista === 'graficos' && this.serie().length === 0) {
      this.cargarSerie();
    }
  }

  protected cambiarPeriodo(periodo: Periodo): void {
    if (this.periodo() === periodo) return;
    this.periodo.set(periodo);
    this.cargarSerie();
  }

  protected async cargarSerie(): Promise<void> {
    this.cargandoSerie.set(true);
    this.errorSerie.set(null);
    try {
      this.serie.set(
        this.periodo() === 'diario'
          ? await this.gananciaService.obtenerSerieDiaria(14)
          : await this.gananciaService.obtenerSerieMensual(6),
      );
    } catch {
      this.errorSerie.set('No se pudo cargar el gráfico. Intenta de nuevo.');
    } finally {
      this.cargandoSerie.set(false);
    }
  }

  private cargarVistaGuardada(): Vista {
    try {
      return localStorage.getItem(CLAVE_VISTA) === 'graficos' ? 'graficos' : 'tarjetas';
    } catch {
      return 'tarjetas';
    }
  }
}
