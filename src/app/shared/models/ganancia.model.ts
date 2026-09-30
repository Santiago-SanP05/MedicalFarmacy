export interface ResumenGanancias {
  ventas_hoy: number;
  ganancia_hoy: number;
  ventas_mes: number;
  ganancia_mes: number;
}

/** Un punto del gráfico (un día o un mes), ya con la etiqueta lista para mostrar. */
export interface PuntoGrafico {
  etiqueta: string;
  ventas: number;
  ganancia: number;
}
