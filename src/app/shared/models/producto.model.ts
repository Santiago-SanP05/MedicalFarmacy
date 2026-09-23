export interface Producto {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  imagen_url: string | null;
  activo: boolean;
}

export type ProductoInput = Omit<Producto, 'id'>;
