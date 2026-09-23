# Especificación del Proyecto: Sistema de Pedidos de Medicamentos

## 1. Descripción general

Aplicación web en **Angular**, de **un solo proveedor** (no multiusuario/multitienda), donde los usuarios arman un carrito sin necesidad de login y reciben un **ID alfanumérico de 4 dígitos** que identifica su pedido. Ese ID se lo entregan (fuera del sistema, ej. de palabra o por WhatsApp) al **admin**, quien es el único que puede buscar el pedido por ese ID, completarlo con los datos del comprador y **generar la factura en PDF**. No hay pasarela de pago ni control de stock.

---

## 2. Roles y permisos

| Acción | Usuario (sin login) | Admin (con login) |
|---|---|---|
| Ver catálogo de productos | ✅ | ✅ |
| Agregar productos al carrito | ✅ | ❌ |
| Generar el pedido y obtener el ID de 4 dígitos | ✅ | ❌ |
| Buscar un pedido por su ID | ❌ | ✅ |
| Completar datos del comprador (nombre, teléfono) | ❌ | ✅ |
| Finalizar el pedido y generar la factura (PDF) | ❌ | ✅ |
| Cambiar el estado del pedido (pendiente ↔ finalizado) | ❌ | ✅ |
| Ver todos los pedidos/facturas históricos | ❌ | ✅ |
| Crear / editar / eliminar productos | ❌ | ✅ |
| Login | ❌ | ✅ (único admin) |

> Solo existe **una cuenta admin** en todo el sistema (no hay múltiples administradores ni multitienda).

---

## 3. Flujo funcional (actualizado)

1. El usuario entra al catálogo (sin login).
2. Agrega productos al carrito (cantidad libre, sin límite de stock).
3. El carrito muestra el detalle y el total en tiempo real.
4. El usuario confirma el pedido → el sistema:
   - Genera un **ID alfanumérico de 4 dígitos** (único).
   - Guarda el pedido con **estado `pendiente`** (sin datos del comprador todavía, sin factura).
5. Se le muestra el ID al usuario en pantalla, para que lo anote y se lo entregue al admin.
6. El **admin** inicia sesión y busca el pedido ingresando ese ID de 4 dígitos.
7. El admin abre el pedido encontrado, ve el detalle (productos, cantidades, total) y **completa los datos del comprador**: nombre y teléfono (mínimo).
8. El admin presiona **"Finalizar"**:
   - Solo en este momento se genera la **factura** (con los datos del comprador + detalle del pedido).
   - El pedido cambia su estado de `pendiente` a **`finalizado`**.
9. El admin puede **ver y descargar la factura en PDF** desde el detalle del pedido.
10. El admin puede ver el listado completo de pedidos (filtrando por estado) y su historial de facturas.

> Importante: la factura **no existe** mientras el pedido está en estado `pendiente`. Solo se genera al finalizar. Antes de eso, el pedido es solo un carrito guardado con un ID.

---

## 4. Estados del pedido

Solo existen **dos estados**:

| Estado | Descripción |
|---|---|
| `pendiente` | El usuario generó el carrito y el ID, pero el admin aún no lo ha buscado/completado. No tiene factura. |
| `finalizado` | El admin completó los datos del comprador y generó la factura en PDF. |

- El cambio de estado es manual y ocurre **automáticamente al finalizar** (no hay un botón separado para "cambiar estado" y otro para "generar factura": es una sola acción).
- No hay estado `cancelado` por ahora (si se necesita más adelante, se puede agregar).

---

## 5. Reglas y detalles por resolver

### 5.1 Búsqueda de pedidos por ID (admin)
- El admin necesita un buscador simple: input de 4 caracteres → trae el pedido si existe.
- Si el ID no existe o ya fue escrito mal, mostrar un mensaje claro de "pedido no encontrado".
- Si el pedido ya está `finalizado` y el admin lo busca de nuevo, debería poder **ver la factura ya generada** (no completar datos otra vez ni duplicar la factura).

### 5.2 Datos del comprador
- Campos actuales: **nombre** y **teléfono**. Ambos obligatorios para poder finalizar.
- El modelo debe quedar **escalable**: se recomienda modelar los datos del comprador como un objeto independiente (`Comprador`) dentro del pedido, en vez de campos sueltos, para poder agregar más campos (dirección, correo, documento, etc.) en el futuro sin romper la estructura existente.
- La factura debe mostrar, además de estos datos, el **detalle completo de lo comprado** (productos, cantidades, precios) y el **total**.

### 5.3 Factura en PDF
- Debe incluir: ID del pedido, datos del comprador (nombre, teléfono), fecha de finalización, detalle de productos (nombre, cantidad, precio unitario, subtotal) y total.
- Se genera **al finalizar** y debe quedar disponible para descargar en cualquier momento después (no solo en el momento de creación).
- Técnicamente, en Angular esto se puede resolver en el frontend con una librería como `jsPDF` o `pdfmake`, o generarse en el backend y servirse como archivo descargable.

### 5.4 Carrito y snapshot de precios
- Como el pedido puede quedar en estado `pendiente` por un tiempo (mientras el usuario le pasa el ID al admin), y el admin puede tardar en finalizarlo, es importante congelar (**snapshot**) el nombre y precio de cada producto en el momento en que el usuario genera el pedido — así, si el admin edita el precio de un producto después, no se altera el total de pedidos ya generados.
- Cantidad mínima por producto: 1. No se permite carrito vacío para generar el pedido.

### 5.5 Generación del ID de 4 dígitos
- Alfanumérico, recomendable usar mayúsculas + números y evitar caracteres ambiguos (`0`, `O`, `1`, `I`, `L`) ya que el usuario debe poder decirlo o escribirlo a mano sin confusión.
- Debe validarse que sea único contra los pedidos existentes antes de asignarlo.

### 5.6 Productos (CRUD)
- Campos: `id`, `nombre`, `descripción`, `precio`, `estado` (activo/inactivo).
- Al eliminar un producto, usar **borrado lógico** (`activo: false`) para no afectar pedidos/facturas ya generados que lo referencian (gracias al snapshot del punto 5.4, esto no rompe nada).

### 5.7 Autenticación del admin
- Una sola cuenta fija (usuario + contraseña), **validada en el frontend** ya que no hay backend (ver sección 9 sobre las limitaciones de seguridad que esto implica).
- Sesión simple manejada en el navegador (ej. una bandera en `localStorage`/`sessionStorage` tras un login correcto).
- Rutas de admin protegidas con un `authGuard` en Angular.

### 5.8 No funcionales
- Responsive (probable uso desde celular, tanto por el usuario como por el admin).
- Manejo de estados de carga y errores (ej. al buscar un ID que no existe, al generar el PDF).
- Sin datos de pago, por lo que no aplica normativa de medios de pago; sí se maneja un dato personal básico (nombre y teléfono del comprador), a tener en cuenta si más adelante se requiere alguna política de privacidad.

---

## 9. Persistencia sin backend (frontend-only)

Dado que la app es de bajo volumen (menos de 10 ventas al mes) y no tendrá backend, toda la información se guarda del lado del navegador:

- **Dónde guardar:** `localStorage` (más simple) o `IndexedDB` (más robusto si el volumen de datos crece o se quieren hacer búsquedas más complejas). Para este tamaño de app, `localStorage` con un archivo/objeto JSON es suficiente.
- **Qué se guarda:** productos, pedidos (con su estado, datos del comprador y detalle), y la sesión del admin.
- **Estructura recomendada:** un servicio Angular (`storage.service.ts`) que centralice el leer/escribir en `localStorage`, serializando/deserializando JSON, para que el resto de la app no dependa directamente de la API del navegador.
- **Limitaciones importantes a tener en cuenta:**
  - Los datos **viven solo en ese navegador/dispositivo**. Si el admin entra desde otro computador o borra el caché del navegador, **pierde todo el historial** de productos y pedidos.
  - No hay forma de que el usuario (que genera el carrito) y el admin (que lo busca) compartan datos automáticamente si usan **dispositivos distintos** — el catálogo de productos debe estar accesible para ambos en el mismo navegador, o bien el catálogo de productos se define como datos "fijos" en el código y solo los pedidos/facturas dependen de `localStorage`. **Esto es un punto crítico a decidir** (ver pregunta abierta más abajo).
  - `localStorage` tiene un límite de tamaño (~5-10 MB según navegador), pero para este volumen de uso no debería ser un problema.
  - Al no haber backend, la "seguridad" del login de admin es básica (cualquiera con acceso al código fuente del build podría ver la contraseña si está hardcodeada). Aceptable para una app pequeña de uso interno, pero vale la pena tenerlo claro.
- **Borrado manual:** el admin debe tener, dentro de su panel, una opción para eliminar pedidos/facturas antiguos (individualmente o en bloque) ya que no hay una limpieza automática.

---

## 10. Pregunta abierta clave

Con la app funcionando **sin backend**, ¿el flujo de "usuario genera el carrito → le da el ID al admin → el admin lo busca" ocurre **en el mismo navegador/dispositivo** (ej. una tablet fija en el local que usan tanto clientes como el admin), o en dispositivos distintos (el cliente desde su celular y el admin desde su computador)? Esto es clave porque, sin backend, si son dispositivos distintos, el admin **no podrá ver pedidos generados por otros usuarios en otros dispositivos** — los datos de `localStorage` no se comparten entre navegadores/equipos.

---

## 6. Modelo de datos actualizado

```
Producto
- id
- nombre
- descripcion
- precio
- activo (boolean)

Pedido
- id (4 caracteres alfanuméricos, único)
- estado ("pendiente" | "finalizado")
- fechaCreacion          (cuando el usuario generó el pedido)
- fechaFinalizacion      (cuando el admin finalizó, null si sigue pendiente)
- comprador: {           (null hasta que el admin lo complete; objeto escalable)
    nombre,
    telefono
    // futuro: direccion, correo, documento, etc.
  }
- total
- items: [ ]

ItemPedido
- productoId
- nombreProducto     (snapshot)
- precioUnitario     (snapshot)
- cantidad
- subtotal

Admin
- id
- usuario
- passwordHash
```

---

## 7. Estructura sugerida del proyecto Angular

```
src/app/
├── core/
│   ├── guards/
│   │   └── admin.guard.ts
│   └── services/
│       ├── auth.service.ts
│       ├── producto.service.ts
│       ├── pedido.service.ts
│       ├── carrito.service.ts
│       └── pdf.service.ts        (generación/descarga de factura)
├── features/
│   ├── catalogo/
│   ├── carrito/
│   ├── confirmacion-pedido/      (pantalla que muestra el ID al usuario)
│   ├── admin/
│   │   ├── login/
│   │   ├── productos/            (CRUD)
│   │   ├── buscar-pedido/        (input de ID de 4 dígitos)
│   │   ├── detalle-pedido/       (completar datos + botón "Finalizar")
│   │   └── listado-pedidos/      (filtrar por pendiente / finalizado)
├── shared/
│   ├── models/
│   │   ├── producto.model.ts
│   │   └── pedido.model.ts
│   └── components/
```

---

## 8. Respuestas definidas (cierre de alcance)

1. **Datos del comprador:** por ahora solo **nombre y teléfono**, pero el modelo debe quedar **escalable** para agregar más campos después (dirección, correo, documento, etc.) sin tener que rediseñar la estructura. Además de esto, la factura debe mostrar el **detalle de lo comprado** (productos, cantidades, precios) y el **total**.
2. **Sin backend.** Es una app pequeña (menos de 10 ventas al mes), por lo que toda la persistencia (productos, pedidos, facturas) se maneja **100% en el frontend**, guardando la información en el navegador (ver sección 9). El admin borra manualmente los pedidos/facturas viejos cuando quiere liberar espacio o limpiar el historial.
3. **Edición post-finalización:** una vez finalizado un pedido, el admin **solo puede editar los datos del comprador** (nombre, teléfono). No puede modificar el detalle de productos, cantidades ni el total — eso queda fijo desde el momento en que se finalizó.
4. **Sin tiempo límite** para que un pedido `pendiente` expire. Al ser una app de bajo volumen, los pedidos quedan esperando indefinidamente hasta que el admin los busca por ID, y es el propio admin quien decide cuándo borrar los que ya no sirven.