import { Component, input, signal } from '@angular/core';

@Component({
  selector: 'app-producto-imagen',
  template: `
    @if (url() && !fallo()) {
      <img
        [src]="url()"
        [alt]="alt()"
        loading="lazy"
        referrerpolicy="no-referrer"
        (error)="fallo.set(true)"
      />
    } @else {
      <div class="placeholder" role="img" [attr.aria-label]="'Sin imagen: ' + alt()">
        <svg viewBox="0 0 24 24" width="40%" height="40%" aria-hidden="true">
          <rect width="24" height="24" rx="6" fill="currentColor" opacity="0.15" />
          <path d="M12 6v12M6 12h12" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
        </svg>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }

    img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
      background: var(--surface);
    }

    .placeholder {
      display: grid;
      place-items: center;
      width: 100%;
      height: 100%;
      background: var(--primary-soft);
      color: var(--primary-dark);
    }

    :host(.cubrir) img {
      object-fit: contain;
      transform: scale(1.34);
      transition: transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);
    }

    :host(.cubrir:hover) img {
      transform: scale(1);
    }

    @media (prefers-reduced-motion: reduce) {
      :host(.cubrir) img {
        transition: none;
      }
    }

    :host(.cubrir) .placeholder {
      background: var(--pub-mint);
      color: var(--pub-primary-dark);
    }
  `,
  host: { '[class.cubrir]': 'cubrir()' },
})
export class ProductoImagen {
  readonly url = input<string | null | undefined>();
  readonly alt = input('');
  /** true: la imagen llena todo el recuadro recortándose (todas las tarjetas iguales). */
  readonly cubrir = input(false);
  protected readonly fallo = signal(false);
}
