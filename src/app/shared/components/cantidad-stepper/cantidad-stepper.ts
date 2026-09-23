import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-cantidad-stepper',
  template: `
    <div class="stepper">
      <button type="button" aria-label="Quitar una unidad" (click)="cambio.emit(cantidad() - 1)">
        −
      </button>
      <span aria-live="polite">{{ cantidad() }}</span>
      <button type="button" aria-label="Agregar una unidad" (click)="cambio.emit(cantidad() + 1)">
        +
      </button>
    </div>
  `,
  styles: `
    .stepper {
      display: inline-flex;
      align-items: center;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--surface);
      overflow: hidden;
    }

    button {
      width: 40px;
      height: 40px;
      border: 0;
      background: transparent;
      color: var(--primary-dark);
      font-size: 1.25rem;
      font-weight: 600;
      cursor: pointer;
    }

    button:hover {
      background: var(--primary-soft);
    }

    span {
      min-width: 32px;
      text-align: center;
      font-weight: 600;
    }
  `,
})
export class CantidadStepper {
  readonly cantidad = input.required<number>();
  readonly cambio = output<number>();
}
