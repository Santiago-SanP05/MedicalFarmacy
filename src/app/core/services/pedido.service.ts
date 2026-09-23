import { inject, Injectable } from '@angular/core';
import { Comprador, EstadoPedido, ItemCarrito, Pedido } from '../../shared/models/pedido.model';
import { lanzarSiError, SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class PedidoService {
  private readonly client = inject(SupabaseService).client;

  async crear(items: ItemCarrito[]): Promise<string> {
    const { data, error } = await this.client.rpc('crear_pedido', {
      p_items: items.map((i) => ({ producto_id: i.producto.id, cantidad: i.cantidad })),
    });
    lanzarSiError(error);
    return data as string;
  }

  async buscarPorId(id: string): Promise<Pedido | null> {
    const { data, error } = await this.client
      .from('pedidos')
      .select('*, items_pedido(*)')
      .eq('id', id.trim().toUpperCase())
      .maybeSingle();
    lanzarSiError(error);
    return data as Pedido | null;
  }

  async listar(estado?: EstadoPedido): Promise<Pedido[]> {
    let consulta = this.client
      .from('pedidos')
      .select('*')
      .order('fecha_creacion', { ascending: false });
    if (estado) consulta = consulta.eq('estado', estado);
    const { data, error } = await consulta;
    lanzarSiError(error);
    return data as Pedido[];
  }

  async finalizar(id: string, nombre: string, telefono: string): Promise<Pedido> {
    const { data, error } = await this.client.rpc('finalizar_pedido', {
      p_id: id,
      p_nombre: nombre,
      p_telefono: telefono,
    });
    lanzarSiError(error);
    return data as Pedido;
  }

  async actualizarComprador(id: string, comprador: Partial<Comprador>): Promise<Pedido> {
    const { data, error } = await this.client.rpc('actualizar_comprador', {
      p_id: id,
      p_comprador: comprador,
    });
    lanzarSiError(error);
    return data as Pedido;
  }

  async eliminar(ids: string[]): Promise<void> {
    const { error } = await this.client.from('pedidos').delete().in('id', ids);
    lanzarSiError(error);
  }
}
