import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, input, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { PdfService } from '../../../core/services/pdf.service';
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
  private readonly pdfService = inject(PdfService);
  private readonly router = inject(Router);
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
  protected readonly eliminando = signal(false);
  protected readonly errorEliminar = signal<string | null>(null);

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

  protected descargarFactura(): void {
    const pedido = this.pedido();
    if (pedido?.estado === 'finalizado') {
      this.pdfService.descargarFactura(pedido);
    }
  }

  protected async eliminarPedido(): Promise<void> {
    const pedido = this.pedido();
    if (!pedido || this.eliminando()) return;
    if (
      !confirm(
        `¿Eliminar el pedido ${pedido.id}? Esta acción no se puede deshacer` +
          (pedido.estado === 'finalizado' ? ' y borrará también su factura.' : '.'),
      )
    ) {
      return;
    }

    this.eliminando.set(true);
    this.errorEliminar.set(null);
    try {
      await this.pedidoService.eliminar([pedido.id]);
      await this.router.navigateByUrl('/admin/pedidos');
    } catch {
      this.errorEliminar.set('No se pudo eliminar el pedido. Intenta de nuevo.');
      this.eliminando.set(false);
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
