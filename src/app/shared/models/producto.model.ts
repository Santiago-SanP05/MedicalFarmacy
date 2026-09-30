export interface Producto {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  /** Porcentaje de ganancia (0-100), informativo: no afecta el precio de venta. */
  margen_pct: number;
  imagen_url: string | null;
  activo: boolean;
}

export type ProductoInput = Omit<Producto, 'id'>;
