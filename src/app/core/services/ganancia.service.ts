import { inject, Injectable } from '@angular/core';
import { PuntoGrafico, ResumenGanancias } from '../../shared/models/ganancia.model';
import { lanzarSiError, SupabaseService } from './supabase.service';

const formatoDia = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short' });
const formatoMes = new Intl.DateTimeFormat('es-CO', { month: 'short', year: '2-digit' });

@Injectable({ providedIn: 'root' })
export class GananciaService {
  private readonly client = inject(SupabaseService).client;

  async obtenerResumen(): Promise<ResumenGanancias> {
    const { data, error } = await this.client.rpc('resumen_ganancias').single();
    lanzarSiError(error);
    return data as ResumenGanancias;
  }

  async obtenerSerieDiaria(dias = 14): Promise<PuntoGrafico[]> {
    const { data, error } = await this.client.rpc('ganancias_diarias', { p_dias: dias });
    lanzarSiError(error);
    return (data as { dia: string; ventas: number; ganancia: number }[]).map((fila) => ({
      etiqueta: formatoDia.format(new Date(`${fila.dia}T00:00:00`)),
      ventas: fila.ventas,
      ganancia: fila.ganancia,
    }));
  }

  async obtenerSerieMensual(meses = 6): Promise<PuntoGrafico[]> {
    const { data, error } = await this.client.rpc('ganancias_mensuales', { p_meses: meses });
    lanzarSiError(error);
    return (data as { mes: string; ventas: number; ganancia: number }[]).map((fila) => ({
      etiqueta: formatoMes.format(new Date(`${fila.mes}T00:00:00`)),
      ventas: fila.ventas,
      ganancia: fila.ganancia,
    }));
  }
}
