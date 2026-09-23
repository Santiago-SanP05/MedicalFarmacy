import { inject, Injectable } from '@angular/core';
import { Producto, ProductoInput } from '../../shared/models/producto.model';
import { lanzarSiError, SupabaseService } from './supabase.service';

const BUCKET = 'productos';
const EXTENSIONES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export const IMAGEN_TIPOS_PERMITIDOS = Object.keys(EXTENSIONES);
export const IMAGEN_TAMANO_MAXIMO = 2 * 1024 * 1024;

@Injectable({ providedIn: 'root' })
export class ProductoService {
  private readonly client = inject(SupabaseService).client;

  async listarActivos(): Promise<Producto[]> {
    const { data, error } = await this.client
      .from('productos')
      .select('*')
      .eq('activo', true)
      .order('nombre');
    lanzarSiError(error);
    return data as Producto[];
  }

  async listarTodos(): Promise<Producto[]> {
    const { data, error } = await this.client.from('productos').select('*').order('nombre');
    lanzarSiError(error);
    return data as Producto[];
  }

  async obtener(id: string): Promise<Producto | null> {
    const { data, error } = await this.client
      .from('productos')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    lanzarSiError(error);
    return data as Producto | null;
  }

  async crear(producto: ProductoInput): Promise<void> {
    const { error } = await this.client.from('productos').insert(producto);
    lanzarSiError(error);
  }

  async actualizar(id: string, cambios: Partial<ProductoInput>): Promise<void> {
    const { error } = await this.client.from('productos').update(cambios).eq('id', id);
    lanzarSiError(error);
  }

  async subirImagen(archivo: File): Promise<string> {
    const ruta = `${crypto.randomUUID()}.${EXTENSIONES[archivo.type]}`;
    const { error } = await this.client.storage
      .from(BUCKET)
      .upload(ruta, archivo, { contentType: archivo.type });
    lanzarSiError(error);
    return this.client.storage.from(BUCKET).getPublicUrl(ruta).data.publicUrl;
  }
}
