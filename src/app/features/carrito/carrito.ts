import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { CarritoService } from '../../core/services/carrito.service';
import { PedidoService } from '../../core/services/pedido.service';
import { CantidadStepper } from '../../shared/components/cantidad-stepper/cantidad-stepper';
import { ProductoImagen } from '../../shared/components/producto-imagen/producto-imagen';

@Component({
  selector: 'app-carrito',
  imports: [RouterLink, CurrencyPipe, CantidadStepper, ProductoImagen],
  templateUrl: './carrito.html',
  styleUrl: './carrito.scss',
})
export class Carrito {
  protected readonly carrito = inject(CarritoService);
  private readonly pedidoService = inject(PedidoService);
  private readonly router = inject(Router);
  protected readonly moneda = environment.moneda;

  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected async generarPedido(): Promise<void> {
    if (this.enviando() || this.carrito.items().length === 0) return;
    this.enviando.set(true);
    this.error.set(null);
    try {
      const id = await this.pedidoService.crear(this.carrito.items());
      this.carrito.vaciar();
      await this.router.navigate(['/confirmacion', id]);
    } catch {
      this.error.set(
        'No se pudo generar el pedido. Revisa tu conexión y, si algún producto ya no está disponible, quítalo del carrito e intenta de nuevo.',
      );
    } finally {
      this.enviando.set(false);
    }
  }
}
