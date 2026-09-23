import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    if (await this.auth.haySesion()) {
      await this.router.navigateByUrl('/admin/pedidos');
    }
  }

  protected async entrar(evento: Event): Promise<void> {
    evento.preventDefault();
    if (this.enviando()) return;
    this.enviando.set(true);
    this.error.set(null);
    try {
      await this.auth.login(this.email().trim(), this.password());
      await this.router.navigateByUrl('/admin/pedidos');
    } catch (e) {
      const credenciales = e instanceof Error && /invalid login/i.test(e.message);
      this.error.set(
        credenciales
          ? 'Correo o contraseña incorrectos.'
          : 'No se pudo iniciar sesión. Revisa tu conexión e intenta de nuevo.',
      );
    } finally {
      this.enviando.set(false);
    }
  }
}
