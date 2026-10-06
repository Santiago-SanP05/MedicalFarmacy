export type Etiqueta = 'drogueria' | 'tienda' | 'alto_costo';

export const ETIQUETAS: { valor: Etiqueta; etiqueta: string }[] = [
  { valor: 'drogueria', etiqueta: 'Droguería' },
  { valor: 'tienda', etiqueta: 'Tienda' },
  { valor: 'alto_costo', etiqueta: 'Altos costos' },
];

export interface Producto {
  id: string;
  nombre: string;
  descripcion: string | null;
  /** Precio original (de costo), el que escribe el admin. */
  precio: number;
  /** % de ganancia sobre el precio final (0-99.99). Define precio_final junto con "precio". */
  margen_pct: number;
  /** Precio final al público = precio / (1 - margen_pct / 100). Calculado por la base de datos. */
  precio_final: number;
  /** Stock actual. Puede quedar en negativo: indica cuánto falta por reponer. */
  cantidad: number;
  /** Un producto puede tener ninguna, una o varias etiquetas. */
  etiquetas: Etiqueta[];
  /** Marca o laboratorio (ej. "Genfar"). Opcional. */
  marca: string | null;
  /** Principio activo (ej. "Ibuprofeno"). Opcional. */
  principio_activo: string | null;
  imagen_url: string | null;
  activo: boolean;
}

export type ProductoInput = Omit<Producto, 'id' | 'precio_final'>;
