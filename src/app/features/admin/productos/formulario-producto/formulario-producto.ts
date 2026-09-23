import { Component, computed, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  IMAGEN_TAMANO_MAXIMO,
  IMAGEN_TIPOS_PERMITIDOS,
  ProductoService,
} from '../../../../core/services/producto.service';
import { ProductoImagen } from '../../../../shared/components/producto-imagen/producto-imagen';

@Component({
  selector: 'app-formulario-producto',
  imports: [RouterLink, ProductoImagen],
  templateUrl: './formulario-producto.html',
  styleUrl: './formulario-producto.scss',
})
export class FormularioProducto implements OnInit {
  readonly id = input<string>();

  private readonly productoService = inject(ProductoService);
  private readonly router = inject(Router);
  private vistaPreviaObjeto: string | null = null;

  protected readonly tiposPermitidos = IMAGEN_TIPOS_PERMITIDOS.join(',');

  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly errorImagen = signal<string | null>(null);
  protected readonly noEncontrado = signal(false);

  protected readonly nombre = signal('');
  protected readonly descripcion = signal('');
  protected readonly precio = signal('');
  protected readonly activo = signal(true);
  protected readonly imagenActual = signal<string | null>(null);
  protected readonly archivo = signal<File | null>(null);
  protected readonly vistaPrevia = signal<string | null>(null);
  protected readonly quitarImagen = signal(false);

  protected readonly imagenMostrada = computed(
    () => this.vistaPrevia() ?? (this.quitarImagen() ? null : this.imagenActual()),
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => this.liberarVistaPrevia());
  }

  async ngOnInit(): Promise<void> {
    const id = this.id();
    if (!id) return;

    this.cargando.set(true);
    try {
      const producto = await this.productoService.obtener(id);
      if (!producto) {
        this.noEncontrado.set(true);
        return;
      }
      this.nombre.set(producto.nombre);
      this.descripcion.set(producto.descripcion ?? '');
      this.precio.set(String(producto.precio));
      this.activo.set(producto.activo);
      this.imagenActual.set(producto.imagen_url);
    } catch {
      this.error.set('No se pudo cargar el producto. Intenta de nuevo.');
    } finally {
      this.cargando.set(false);
    }
  }

  protected seleccionarArchivo(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    const archivo = entrada.files?.[0];
    this.errorImagen.set(null);
    if (!archivo) return;

    if (!IMAGEN_TIPOS_PERMITIDOS.includes(archivo.type)) {
      this.errorImagen.set('Solo se permiten imágenes JPG, PNG o WebP.');
      entrada.value = '';
      return;
    }
    if (archivo.size > IMAGEN_TAMANO_MAXIMO) {
      this.errorImagen.set('La imagen no puede pesar más de 2 MB.');
      entrada.value = '';
      return;
    }

    this.liberarVistaPrevia();
    this.vistaPreviaObjeto = URL.createObjectURL(archivo);
    this.archivo.set(archivo);
    this.vistaPrevia.set(this.vistaPreviaObjeto);
    this.quitarImagen.set(false);
  }

  protected descartarImagen(): void {
    this.liberarVistaPrevia();
    this.archivo.set(null);
    this.vistaPrevia.set(null);
    this.quitarImagen.set(true);
    this.errorImagen.set(null);
  }

  protected async guardar(evento: Event): Promise<void> {
    evento.preventDefault();
    if (this.guardando()) return;

    const nombre = this.nombre().trim();
    const precio = Number(this.precio());
    if (!nombre) {
      this.error.set('El nombre es obligatorio.');
      return;
    }
    if (this.precio().trim() === '' || !Number.isFinite(precio) || precio < 0) {
      this.error.set('Ingresa un precio válido (0 o mayor).');
      return;
    }

    this.guardando.set(true);
    this.error.set(null);
    try {
      const archivo = this.archivo();
      const imagen_url = archivo
        ? await this.productoService.subirImagen(archivo)
        : this.quitarImagen()
          ? null
          : this.imagenActual();

      const datos = {
        nombre,
        descripcion: this.descripcion().trim() || null,
        precio,
        imagen_url,
        activo: this.activo(),
      };

      const id = this.id();
      if (id) {
        await this.productoService.actualizar(id, datos);
      } else {
        await this.productoService.crear(datos);
      }
      await this.router.navigateByUrl('/admin/productos');
    } catch {
      this.error.set('No se pudo guardar el producto. Revisa tu conexión e intenta de nuevo.');
    } finally {
      this.guardando.set(false);
    }
  }

  private liberarVistaPrevia(): void {
    if (this.vistaPreviaObjeto) {
      URL.revokeObjectURL(this.vistaPreviaObjeto);
      this.vistaPreviaObjeto = null;
    }
  }
}
