import { Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-confirmacion-pedido',
  imports: [RouterLink],
  templateUrl: './confirmacion-pedido.html',
  styleUrl: './confirmacion-pedido.scss',
})
export class ConfirmacionPedido {
  readonly id = input.required<string>();

  protected readonly valido = computed(() => /^[A-HJ-KM-NP-Z2-9]{4}$/.test(this.id()));
  protected readonly copiado = signal(false);

  protected async copiar(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.id());
      this.copiado.set(true);
      setTimeout(() => this.copiado.set(false), 2000);
    } catch {
      // sin permiso de portapapeles: el usuario puede anotar el código a mano
    }
  }
}
