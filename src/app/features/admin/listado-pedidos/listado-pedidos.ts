import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { PedidoService } from '../../../core/services/pedido.service';
import { EstadoPedido, Pedido } from '../../../shared/models/pedido.model';

type Filtro = 'todos' | EstadoPedido;

@Component({
  selector: 'app-listado-pedidos',
  imports: [RouterLink, CurrencyPipe, DatePipe],
  templateUrl: './listado-pedidos.html',
  styleUrl: './listado-pedidos.scss',
})
export class ListadoPedidos implements OnInit {
  private readonly pedidoService = inject(PedidoService);
  protected readonly moneda = environment.moneda;

  protected readonly pedidos = signal<Pedido[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly filtro = signal<Filtro>('todos');
  protected readonly busqueda = signal('');

  protected readonly seleccionados = signal<ReadonlySet<string>>(new Set());
  protected readonly eliminando = signal(false);
  protected readonly errorEliminar = signal<string | null>(null);

  protected readonly conteo = computed(() => {
    const lista = this.pedidos();
    return {
      todos: lista.length,
      pendiente: lista.filter((p) => p.estado === 'pendiente').length,
      finalizado: lista.filter((p) => p.estado === 'finalizado').length,
    };
  });

  protected readonly visibles = computed(() => {
    const codigo = this.busqueda().trim().toUpperCase();
    const filtro = this.filtro();
    return this.pedidos().filter(
      (p) => (filtro === 'todos' || p.estado === filtro) && (!codigo || p.id.includes(codigo)),
    );
  });

  protected readonly filtros: { valor: Filtro; etiqueta: string }[] = [
    { valor: 'todos', etiqueta: 'Todos' },
    { valor: 'pendiente', etiqueta: 'Pendientes' },
    { valor: 'finalizado', etiqueta: 'Finalizados' },
  ];

  ngOnInit(): void {
    this.cargar();
  }

  protected async cargar(silencioso = false): Promise<void> {
    if (!silencioso) this.cargando.set(true);
    this.error.set(null);
    try {
      this.pedidos.set(await this.pedidoService.listar());
    } catch {
      this.error.set('No se pudieron cargar los pedidos. Intenta de nuevo.');
    } finally {
      this.cargando.set(false);
    }
  }

  protected estaSeleccionado(id: string): boolean {
    return this.seleccionados().has(id);
  }

  protected alternarSeleccion(id: string): void {
    const actual = new Set(this.seleccionados());
    actual.has(id) ? actual.delete(id) : actual.add(id);
    this.seleccionados.set(actual);
  }

  protected limpiarSeleccion(): void {
    this.seleccionados.set(new Set());
  }

  protected async eliminarSeleccionados(): Promise<void> {
    const ids = Array.from(this.seleccionados());
    if (ids.length === 0 || this.eliminando()) return;
    await this.eliminar(
      ids,
      `¿Eliminar ${ids.length} pedido${ids.length === 1 ? '' : 's'}? Esta acción no se puede deshacer.`,
    );
  }

  protected async eliminarUno(id: string, evento: Event): Promise<void> {
    evento.preventDefault();
    evento.stopPropagation();
    if (this.eliminando()) return;
    await this.eliminar([id], `¿Eliminar el pedido ${id}? Esta acción no se puede deshacer.`);
  }

  private async eliminar(ids: string[], mensajeConfirmacion: string): Promise<void> {
    if (!confirm(mensajeConfirmacion)) return;

    this.eliminando.set(true);
    this.errorEliminar.set(null);
    try {
      await this.pedidoService.eliminar(ids);
      const restantes = new Set(this.seleccionados());
      for (const id of ids) restantes.delete(id);
      this.seleccionados.set(restantes);
      await this.cargar(true);
    } catch {
      this.errorEliminar.set('No se pudieron eliminar los pedidos. Intenta de nuevo.');
    } finally {
      this.eliminando.set(false);
    }
  }
}
