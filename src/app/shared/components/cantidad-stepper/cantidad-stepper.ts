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
      gap: 4px;
      padding: 4px;
      border-radius: 999px;
      background: var(--pub-bg);
      box-shadow:
        inset 3px 3px 7px var(--pub-neu-dark),
        inset -3px -3px 7px var(--pub-neu-light);
    }

    button {
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      border: 0;
      border-radius: 50%;
      background: var(--pub-bg);
      color: var(--pub-primary-dark);
      font-size: 1.15rem;
      font-weight: 700;
      line-height: 1;
      cursor: pointer;
      box-shadow:
        3px 3px 6px var(--pub-neu-dark),
        -3px -3px 6px var(--pub-neu-light);
      transition: box-shadow 0.15s;
    }

    button:active {
      box-shadow:
        inset 2px 2px 5px var(--pub-neu-dark),
        inset -2px -2px 5px var(--pub-neu-light);
    }

    span {
      min-width: 28px;
      color: var(--pub-ink);
      font-weight: 700;
      text-align: center;
    }
  `,
})
export class CantidadStepper {
  readonly cantidad = input.required<number>();
  readonly cambio = output<number>();
}
