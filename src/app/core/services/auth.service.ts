import { inject, Injectable, signal } from '@angular/core';
import { Session } from '@supabase/supabase-js';
import { lanzarSiError, SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly client = inject(SupabaseService).client;
  readonly sesion = signal<Session | null>(null);

  constructor() {
    this.client.auth.getSession().then(({ data }) => this.sesion.set(data.session));
    this.client.auth.onAuthStateChange((_evento, session) => this.sesion.set(session));
  }

  async login(email: string, password: string): Promise<void> {
    const { error } = await this.client.auth.signInWithPassword({ email, password });
    lanzarSiError(error);
  }

  async logout(): Promise<void> {
    const { error } = await this.client.auth.signOut();
    lanzarSiError(error);
  }

  async haySesion(): Promise<boolean> {
    const { data } = await this.client.auth.getSession();
    return data.session !== null;
  }
}
