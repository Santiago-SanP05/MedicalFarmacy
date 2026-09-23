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

  protected async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.pedidos.set(await this.pedidoService.listar());
    } catch {
      this.error.set('No se pudieron cargar los pedidos. Intenta de nuevo.');
    } finally {
      this.cargando.set(false);
    }
  }
}
