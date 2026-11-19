import { DOCUMENT } from '@angular/common';
import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { BusquedaService } from './core/services/busqueda.service';
import { CarritoService } from './core/services/carrito.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly carrito = inject(CarritoService);
  protected readonly busqueda = inject(BusquedaService);
  private readonly router = inject(Router);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /** El login no lleva navbar: solo el logo arriba. */
  protected readonly enLogin = computed(() => this.url().startsWith('/admin/login'));
  protected readonly enAdmin = computed(() => this.url().startsWith('/admin') && !this.enLogin());
  protected readonly enCatalogo = computed(() => this.url() === '/');

  constructor() {
    // Clases en <html> para el scroll: el login no se desplaza y el catálogo tiene barra propia.
    const html = inject(DOCUMENT).documentElement;
    effect(() => {
      html.classList.toggle('sin-scroll', this.enLogin());
      html.classList.toggle('scroll-catalogo', this.enCatalogo());
    });
  }
}
