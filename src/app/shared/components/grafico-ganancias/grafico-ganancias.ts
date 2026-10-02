import { CurrencyPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { PuntoGrafico } from '../../models/ganancia.model';

@Component({
  selector: 'app-grafico-ganancias',
  imports: [CurrencyPipe],
  template: `
    <div class="leyenda">
      <span class="leyenda__item"><i class="muestra muestra--ventas"></i> Ventas</span>
      <span class="leyenda__item"><i class="muestra muestra--ganancia"></i> Ganancia</span>
    </div>

    <div
      class="grafico"
      role="img"
      [attr.aria-label]="'Gráfico de ventas y ganancia en ' + datos().length + ' periodos'"
    >
      @for (punto of datos(); track punto.etiqueta) {
        <div class="columna">
          <div class="barras">
            <div
              class="barra barra--ventas"
              [style.height.%]="altura(punto.ventas)"
              [title]="'Ventas: ' + (punto.ventas | currency: moneda() : 'symbol-narrow' : '1.0-0')"
            ></div>
            <div
              class="barra barra--ganancia"
              [style.height.%]="altura(punto.ganancia)"
              [title]="
                'Ganancia: ' + (punto.ganancia | currency: moneda() : 'symbol-narrow' : '1.0-0')
              "
            ></div>
          </div>
          <span class="etiqueta">{{ punto.etiqueta }}</span>
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .leyenda {
      display: flex;
      gap: 16px;
      margin-bottom: 14px;
      color: var(--muted);
      font-size: 0.85rem;
    }

    .leyenda__item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .muestra {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 3px;
    }

    .muestra--ventas {
      background: var(--neutral);
    }

    .muestra--ganancia {
      background: var(--primary);
    }

    .grafico {
      display: flex;
      align-items: flex-end;
      gap: 12px;
      height: 220px;
      padding: 12px 6px 0;
      border-bottom: 1px solid var(--border);
      background-image: repeating-linear-gradient(
        to top,
        transparent 0,
        transparent calc(25% - 1px),
        var(--border) calc(25% - 1px),
        var(--border) 25%
      );
      background-size: 100% 100%;
      background-repeat: no-repeat;
      overflow-x: auto;
    }

    .columna {
      display: flex;
      flex: 1 0 44px;
      min-width: 44px;
      height: 100%;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .barras {
      display: flex;
      align-items: flex-end;
      gap: 4px;
      width: 100%;
      flex: 1;
    }

    .barra {
      flex: 1;
      min-height: 3px;
      border-radius: var(--radius-sm) var(--radius-sm) 0 0;
      transition:
        opacity 0.15s,
        transform 0.15s;
      transform-origin: bottom;
    }

    .barra:hover {
      opacity: 0.85;
      transform: scaleX(1.08);
    }

    .barra--ventas {
      background: var(--neutral);
    }

    .barra--ganancia {
      background: linear-gradient(180deg, var(--primary), var(--primary-dark));
      box-shadow: 0 2px 6px -2px color-mix(in srgb, var(--primary) 60%, transparent);
    }

    .etiqueta {
      overflow: hidden;
      max-width: 100%;
      color: var(--muted);
      font-size: 0.7rem;
      line-height: 1.2;
      text-align: center;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `,
})
export class GraficoGanancias {
  readonly datos = input.required<PuntoGrafico[]>();
  readonly moneda = input('COP');

  protected readonly maximo = computed(() =>
    Math.max(1, ...this.datos().flatMap((p) => [p.ventas, p.ganancia])),
  );

  protected altura(valor: number): number {
    return (valor / this.maximo()) * 100;
  }
}
