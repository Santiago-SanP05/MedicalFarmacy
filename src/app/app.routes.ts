import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Catálogo · GERDMART',
    loadComponent: () => import('./features/catalogo/catalogo').then((m) => m.Catalogo),
  },
  {
    path: 'carrito',
    title: 'Carrito · GERDMART',
    loadComponent: () => import('./features/carrito/carrito').then((m) => m.Carrito),
  },
  {
    path: 'confirmacion/:id',
    title: 'Pedido generado · GERDMART',
    loadComponent: () =>
      import('./features/confirmacion-pedido/confirmacion-pedido').then(
        (m) => m.ConfirmacionPedido,
      ),
  },
  {
    path: 'admin/login',
    title: 'Ingreso administrador · GERDMART',
    loadComponent: () => import('./features/admin/login/login').then((m) => m.Login),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/admin-layout/admin-layout').then((m) => m.AdminLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'pedidos' },
      {
        path: 'pedidos',
        title: 'Pedidos · GERDMART',
        loadComponent: () =>
          import('./features/admin/listado-pedidos/listado-pedidos').then((m) => m.ListadoPedidos),
      },
      {
        path: 'pedidos/:id',
        title: 'Detalle del pedido · GERDMART',
        loadComponent: () =>
          import('./features/admin/detalle-pedido/detalle-pedido').then((m) => m.DetallePedido),
      },
      {
        path: 'ganancias',
        title: 'Ganancias · GERDMART',
        loadComponent: () => import('./features/admin/ganancias/ganancias').then((m) => m.Ganancias),
      },
      {
        path: 'productos',
        title: 'Productos · GERDMART',
        loadComponent: () =>
          import('./features/admin/productos/listado-productos/listado-productos').then(
            (m) => m.ListadoProductos,
          ),
      },
      {
        path: 'productos/nuevo',
        title: 'Nuevo producto · GERDMART',
        loadComponent: () =>
          import('./features/admin/productos/formulario-producto/formulario-producto').then(
            (m) => m.FormularioProducto,
          ),
      },
      {
        path: 'productos/:id/editar',
        title: 'Editar producto · GERDMART',
        loadComponent: () =>
          import('./features/admin/productos/formulario-producto/formulario-producto').then(
            (m) => m.FormularioProducto,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
