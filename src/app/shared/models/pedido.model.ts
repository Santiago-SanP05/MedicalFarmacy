import { Producto } from './producto.model';

export type EstadoPedido = 'pendiente' | 'finalizado';

export interface Comprador {
  nombre: string;
  telefono: string;
  [campo: string]: string | undefined;
}

export interface ItemPedido {
  id: number;
  pedido_id: string;
  producto_id: string | null;
  nombre_producto: string;
  precio_unitario: number;
  cantidad: number;
  subtotal: number;
}

export interface Pedido {
  id: string;
  estado: EstadoPedido;
  fecha_creacion: string;
  fecha_finalizacion: string | null;
  comprador: Comprador | null;
  total: number;
  items_pedido?: ItemPedido[];
}

export interface ItemCarrito {
  producto: Producto;
  cantidad: number;
}
