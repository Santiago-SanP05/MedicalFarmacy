import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, input, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { PedidoService } from '../../../core/services/pedido.service';
import { Pedido } from '../../../shared/models/pedido.model';

@Component({
  selector: 'app-detalle-pedido',
  imports: [RouterLink, CurrencyPipe, DatePipe],
  templateUrl: './detalle-pedido.html',
  styleUrl: './detalle-pedido.scss',
})
export class DetallePedido implements OnInit {
  readonly id = input.required<string>();

  private readonly pedidoService = inject(PedidoService);
  protected readonly moneda = environment.moneda;

  protected readonly pedido = signal<Pedido | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly noEncontrado = signal(false);

  protected readonly nombre = signal('');
  protected readonly telefono = signal('');
  protected readonly editando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly errorAccion = signal<string | null>(null);

  ngOnInit(): void {
    this.cargar();
  }

  protected async cargar(silencioso = false): Promise<void> {
    if (!silencioso) this.cargando.set(true);
    this.error.set(null);
    try {
      const pedido = await this.pedidoService.buscarPorId(this.id());
      this.noEncontrado.set(pedido === null);
      this.pedido.set(pedido);
      this.nombre.set(pedido?.comprador?.nombre ?? '');
      this.telefono.set(pedido?.comprador?.telefono ?? '');
    } catch {
      this.error.set('No se pudo cargar el pedido. Intenta de nuevo.');
    } finally {
      this.cargando.set(false);
    }
  }

  protected iniciarEdicion(): void {
    this.errorAccion.set(null);
    this.editando.set(true);
  }

  protected cancelarEdicion(): void {
    const comprador = this.pedido()?.comprador;
    this.nombre.set(comprador?.nombre ?? '');
    this.telefono.set(comprador?.telefono ?? '');
    this.errorAccion.set(null);
    this.editando.set(false);
  }

  protected async enviar(evento: Event): Promise<void> {
    evento.preventDefault();
    const pedido = this.pedido();
    if (!pedido || this.guardando()) return;

    const nombre = this.nombre().trim();
    const telefono = this.telefono().trim();
    if (!nombre || !telefono) {
      this.errorAccion.set('El nombre y el teléfono son obligatorios.');
      return;
    }

    const finalizando = pedido.estado === 'pendiente';
    if (
      finalizando &&
      !confirm(
        `¿Finalizar el pedido ${pedido.id}? Después solo podrás editar los datos del comprador.`,
      )
    ) {
      return;
    }

    this.guardando.set(true);
    this.errorAccion.set(null);
    try {
      if (finalizando) {
        await this.pedidoService.finalizar(pedido.id, nombre, telefono);
      } else {
        await this.pedidoService.actualizarComprador(pedido.id, { nombre, telefono });
      }
      this.editando.set(false);
      await this.cargar(true);
    } catch (e) {
      this.errorAccion.set(
        e instanceof Error ? e.message : 'No se pudo guardar. Intenta de nuevo.',
      );
    } finally {
      this.guardando.set(false);
    }
  }
}
