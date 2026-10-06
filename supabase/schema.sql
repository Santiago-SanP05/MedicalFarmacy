-- MedicalShop: esquema para Supabase. Pegar completo en SQL Editor y ejecutar.

-- ============ TABLAS ============

create table public.productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(trim(nombre)) > 0),
  descripcion text,
  precio numeric(12,2) not null check (precio >= 0),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ID de 4 caracteres sin 0, O, 1, I, L
create table public.pedidos (
  id text primary key check (id ~ '^[A-HJ-KM-NP-Z2-9]{4}$'),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'finalizado')),
  fecha_creacion timestamptz not null default now(),
  fecha_finalizacion timestamptz,
  comprador jsonb,
  total numeric(12,2) not null default 0
);

create table public.items_pedido (
  id bigint generated always as identity primary key,
  pedido_id text not null references public.pedidos(id) on delete cascade,
  producto_id uuid,
  nombre_producto text not null,
  precio_unitario numeric(12,2) not null,
  cantidad int not null check (cantidad > 0),
  subtotal numeric(12,2) not null
);

create index on public.items_pedido (pedido_id);

create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- ============ SEGURIDAD (RLS) ============

alter table public.productos enable row level security;
alter table public.pedidos enable row level security;
alter table public.items_pedido enable row level security;
alter table public.admins enable row level security;

create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create policy "catalogo publico" on public.productos
  for select to anon, authenticated using (activo);

create policy "admin gestiona productos" on public.productos
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

create policy "admin lee pedidos" on public.pedidos
  for select to authenticated using (public.es_admin());

create policy "admin borra pedidos" on public.pedidos
  for delete to authenticated using (public.es_admin());

create policy "admin lee items" on public.items_pedido
  for select to authenticated using (public.es_admin());

-- ============ FUNCIONES ============

-- Usuario sin login: crea el pedido con precios reales del servidor y devuelve el ID.
-- p_items: [{"producto_id": "<uuid>", "cantidad": 2}, ...]
create or replace function public.crear_pedido(p_items jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_alfabeto constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_id text;
  v_esperados int;
  v_insertados int;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'El carrito está vacío';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_items) x
    where (x->>'cantidad')::int is null or (x->>'cantidad')::int < 1
  ) then
    raise exception 'Cantidad inválida';
  end if;

  loop
    v_id := '';
    for n in 1..4 loop
      v_id := v_id || substr(v_alfabeto, 1 + floor(random() * length(v_alfabeto))::int, 1);
    end loop;
    begin
      insert into pedidos (id) values (v_id);
      exit;
    exception when unique_violation then
      null;
    end;
  end loop;

  select count(distinct x->>'producto_id') into v_esperados
  from jsonb_array_elements(p_items) x;

  insert into items_pedido (pedido_id, producto_id, nombre_producto, precio_unitario, cantidad, subtotal)
  select v_id, p.id, p.nombre, p.precio, g.cantidad, p.precio * g.cantidad
  from (
    select (x->>'producto_id')::uuid as producto_id, sum((x->>'cantidad')::int)::int as cantidad
    from jsonb_array_elements(p_items) x
    group by 1
  ) g
  join productos p on p.id = g.producto_id and p.activo;

  get diagnostics v_insertados = row_count;
  if v_insertados <> v_esperados then
    raise exception 'Hay productos no disponibles';
  end if;

  update pedidos
  set total = (select coalesce(sum(subtotal), 0) from items_pedido where pedido_id = v_id)
  where id = v_id;

  return v_id;
end;
$$;

-- Admin: completa datos del comprador y finaliza (pendiente -> finalizado).
create or replace function public.finalizar_pedido(p_id text, p_nombre text, p_telefono text)
returns public.pedidos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido public.pedidos;
begin
  if not public.es_admin() then
    raise exception 'No autorizado';
  end if;

  if coalesce(trim(p_nombre), '') = '' or coalesce(trim(p_telefono), '') = '' then
    raise exception 'Nombre y teléfono son obligatorios';
  end if;

  update public.pedidos
  set estado = 'finalizado',
      fecha_finalizacion = now(),
      comprador = jsonb_build_object('nombre', trim(p_nombre), 'telefono', trim(p_telefono))
  where id = upper(p_id) and estado = 'pendiente'
  returning * into v_pedido;

  if not found then
    raise exception 'Pedido no encontrado o ya finalizado';
  end if;

  return v_pedido;
end;
$$;

-- Admin: edita solo los datos del comprador de un pedido ya finalizado.
create or replace function public.actualizar_comprador(p_id text, p_comprador jsonb)
returns public.pedidos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido public.pedidos;
begin
  if not public.es_admin() then
    raise exception 'No autorizado';
  end if;

  update public.pedidos
  set comprador = comprador || p_comprador
  where id = upper(p_id) and estado = 'finalizado'
  returning * into v_pedido;

  if not found then
    raise exception 'Pedido no encontrado o aún pendiente';
  end if;

  if coalesce(trim(v_pedido.comprador->>'nombre'), '') = ''
     or coalesce(trim(v_pedido.comprador->>'telefono'), '') = '' then
    raise exception 'Nombre y teléfono son obligatorios';
  end if;

  return v_pedido;
end;
$$;

revoke all on function public.crear_pedido(jsonb) from public;
revoke all on function public.finalizar_pedido(text, text, text) from public;
revoke all on function public.actualizar_comprador(text, jsonb) from public;

grant execute on function public.crear_pedido(jsonb) to anon, authenticated;
grant execute on function public.finalizar_pedido(text, text, text) to authenticated;
grant execute on function public.actualizar_comprador(text, jsonb) to authenticated;

-- ============ ADMIN ============
-- 1) Crea tu usuario en Authentication > Users (email + contraseña).
-- 2) Reemplaza el correo y ejecuta esta línea:
insert into public.admins (user_id)
select id from auth.users where email = 'TU_CORREO@ejemplo.com';

-- ============ IMAGEN DE PRODUCTO ============
-- Si ya ejecutaste todo lo anterior, ejecuta solo este bloque.

alter table public.productos add column if not exists imagen_url text;

-- Bucket público (lectura libre por URL), máx. 2 MB, solo jpg/png/webp
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('productos', 'productos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Solo el admin puede subir, reemplazar o borrar imágenes
drop policy if exists "admin sube imagenes" on storage.objects;
create policy "admin sube imagenes" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'productos' and public.es_admin());

drop policy if exists "admin actualiza imagenes" on storage.objects;
create policy "admin actualiza imagenes" on storage.objects
  for update to authenticated
  using (bucket_id = 'productos' and public.es_admin())
  with check (bucket_id = 'productos' and public.es_admin());

drop policy if exists "admin borra imagenes" on storage.objects;
create policy "admin borra imagenes" on storage.objects
  for delete to authenticated
  using (bucket_id = 'productos' and public.es_admin());

-- ============ GANANCIA POR PRODUCTO Y PANEL DE GANANCIAS ============
-- Ejecuta solo este bloque si ya tienes todo lo anterior.
--
-- Qué hace:
-- 1) Agrega un % de ganancia a cada producto (0-100, informativo: no cambia el precio de venta).
-- 2) Ese % se "congela" (snapshot) en cada item_pedido al momento de la compra, igual que ya
--    se hace con el nombre y el precio, para que si luego cambias el % de un producto no se
--    altere la ganancia de pedidos ya vendidos.
-- 3) Agrega una columna calculada "ganancia" (subtotal * margen_pct / 100) en items_pedido.
-- 4) Actualiza crear_pedido para que copie el margen_pct del producto al crear el pedido.
-- 5) Agrega la función resumen_ganancias(), que usa el panel nuevo "Ganancias" del admin
--    para mostrar ventas y ganancia de hoy y del mes (solo pedidos finalizados).

alter table public.productos
  add column if not exists margen_pct numeric(5,2) not null default 0
  check (margen_pct >= 0 and margen_pct <= 100);

alter table public.items_pedido
  add column if not exists margen_pct numeric(5,2) not null default 0;

alter table public.items_pedido
  add column if not exists ganancia numeric(12,2)
  generated always as (round(subtotal * margen_pct / 100, 2)) stored;

-- Reemplaza crear_pedido para que también copie el margen_pct del producto (snapshot).
create or replace function public.crear_pedido(p_items jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_alfabeto constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_id text;
  v_esperados int;
  v_insertados int;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'El carrito está vacío';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_items) x
    where (x->>'cantidad')::int is null or (x->>'cantidad')::int < 1
  ) then
    raise exception 'Cantidad inválida';
  end if;

  loop
    v_id := '';
    for n in 1..4 loop
      v_id := v_id || substr(v_alfabeto, 1 + floor(random() * length(v_alfabeto))::int, 1);
    end loop;
    begin
      insert into pedidos (id) values (v_id);
      exit;
    exception when unique_violation then
      null;
    end;
  end loop;

  select count(distinct x->>'producto_id') into v_esperados
  from jsonb_array_elements(p_items) x;

  insert into items_pedido (pedido_id, producto_id, nombre_producto, precio_unitario, cantidad, subtotal, margen_pct)
  select v_id, p.id, p.nombre, p.precio, g.cantidad, p.precio * g.cantidad, p.margen_pct
  from (
    select (x->>'producto_id')::uuid as producto_id, sum((x->>'cantidad')::int)::int as cantidad
    from jsonb_array_elements(p_items) x
    group by 1
  ) g
  join productos p on p.id = g.producto_id and p.activo;

  get diagnostics v_insertados = row_count;
  if v_insertados <> v_esperados then
    raise exception 'Hay productos no disponibles';
  end if;

  update pedidos
  set total = (select coalesce(sum(subtotal), 0) from items_pedido where pedido_id = v_id)
  where id = v_id;

  return v_id;
end;
$$;

-- Admin: ventas y ganancia de hoy y del mes, solo con pedidos finalizados.
create or replace function public.resumen_ganancias()
returns table (
  ventas_hoy numeric,
  ganancia_hoy numeric,
  ventas_mes numeric,
  ganancia_mes numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.es_admin() then
    raise exception 'No autorizado';
  end if;

  return query
  select
    coalesce(sum(i.subtotal) filter (
      where date(p.fecha_finalizacion) = current_date
    ), 0) as ventas_hoy,
    coalesce(sum(i.ganancia) filter (
      where date(p.fecha_finalizacion) = current_date
    ), 0) as ganancia_hoy,
    coalesce(sum(i.subtotal) filter (
      where date_trunc('month', p.fecha_finalizacion) = date_trunc('month', current_date)
    ), 0) as ventas_mes,
    coalesce(sum(i.ganancia) filter (
      where date_trunc('month', p.fecha_finalizacion) = date_trunc('month', current_date)
    ), 0) as ganancia_mes
  from public.items_pedido i
  join public.pedidos p on p.id = i.pedido_id
  where p.estado = 'finalizado';
end;
$$;

revoke all on function public.resumen_ganancias() from public;
grant execute on function public.resumen_ganancias() to authenticated;

-- ============ SERIES PARA GRÁFICOS DE GANANCIAS ============
-- Requiere el bloque anterior (columna "ganancia" y función es_admin()).
-- Alimentan la vista de "Gráficos" del panel de Ganancias: una fila por día/mes,
-- incluyendo los días/meses sin ventas (en 0), para que el gráfico no tenga huecos.

create or replace function public.ganancias_diarias(p_dias int default 14)
returns table (dia date, ventas numeric, ganancia numeric)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.es_admin() then
    raise exception 'No autorizado';
  end if;

  if p_dias is null or p_dias < 1 or p_dias > 365 then
    raise exception 'Rango de días inválido';
  end if;

  return query
  select
    d.dia,
    coalesce(sum(i.subtotal), 0) as ventas,
    coalesce(sum(i.ganancia), 0) as ganancia
  from (
    select generate_series(current_date - (p_dias - 1), current_date, interval '1 day')::date as dia
  ) d
  left join public.pedidos p
    on p.estado = 'finalizado' and date(p.fecha_finalizacion) = d.dia
  left join public.items_pedido i on i.pedido_id = p.id
  group by d.dia
  order by d.dia;
end;
$$;

create or replace function public.ganancias_mensuales(p_meses int default 6)
returns table (mes date, ventas numeric, ganancia numeric)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.es_admin() then
    raise exception 'No autorizado';
  end if;

  if p_meses is null or p_meses < 1 or p_meses > 60 then
    raise exception 'Rango de meses inválido';
  end if;

  return query
  select
    m.mes,
    coalesce(sum(i.subtotal), 0) as ventas,
    coalesce(sum(i.ganancia), 0) as ganancia
  from (
    select generate_series(
      date_trunc('month', current_date) - ((p_meses - 1) || ' months')::interval,
      date_trunc('month', current_date),
      interval '1 month'
    )::date as mes
  ) m
  left join public.pedidos p
    on p.estado = 'finalizado' and date_trunc('month', p.fecha_finalizacion)::date = m.mes
  left join public.items_pedido i on i.pedido_id = p.id
  group by m.mes
  order by m.mes;
end;
$$;

revoke all on function public.ganancias_diarias(int) from public;
revoke all on function public.ganancias_mensuales(int) from public;

grant execute on function public.ganancias_diarias(int) to authenticated;
grant execute on function public.ganancias_mensuales(int) to authenticated;

-- ============ INVENTARIO (STOCK) ============
-- Ejecuta solo este bloque si ya tienes todo lo anterior.
--
-- Qué hace:
-- 1) Agrega "cantidad" a productos: el stock actual. El admin lo ve y lo edita desde el
--    apartado "Inventario" (es el mismo "Productos" de siempre, solo que ahora muestra el stock).
-- 2) Al finalizar un pedido, descuenta del inventario la cantidad de cada producto vendido.
--    El usuario sin login sigue pudiendo pedir cualquier cantidad (no se valida contra el
--    stock al crear el pedido), así que el inventario puede quedar en negativo: eso significa
--    que se vendió más de lo que había y hay que reponerlo.
-- 3) No toca crear_pedido: el carrito del usuario sigue sin límite de cantidad.

alter table public.productos
  add column if not exists cantidad integer not null default 0;

-- Reemplaza finalizar_pedido para que también descuente el inventario (puede quedar negativo).
create or replace function public.finalizar_pedido(p_id text, p_nombre text, p_telefono text)
returns public.pedidos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido public.pedidos;
begin
  if not public.es_admin() then
    raise exception 'No autorizado';
  end if;

  if coalesce(trim(p_nombre), '') = '' or coalesce(trim(p_telefono), '') = '' then
    raise exception 'Nombre y teléfono son obligatorios';
  end if;

  update public.pedidos
  set estado = 'finalizado',
      fecha_finalizacion = now(),
      comprador = jsonb_build_object('nombre', trim(p_nombre), 'telefono', trim(p_telefono))
  where id = upper(p_id) and estado = 'pendiente'
  returning * into v_pedido;

  if not found then
    raise exception 'Pedido no encontrado o ya finalizado';
  end if;

  update public.productos p
  set cantidad = p.cantidad - i.cantidad
  from public.items_pedido i
  where i.pedido_id = v_pedido.id and i.producto_id = p.id;

  return v_pedido;
end;
$$;

-- ============ PRECIO AL PÚBLICO SOBRE EL PRECIO FINAL ============
-- Ejecuta solo este bloque si ya tienes todo lo anterior.
--
-- Cambia la fórmula del precio que ve el comprador. Antes "precio" era el precio final y
-- "margen_pct" era solo informativo. Ahora "precio" es el precio ORIGINAL (de costo) y el
-- precio al público se calcula así: precio / (1 - margen_pct / 100).
-- Ejemplo: 10.000 / (1 - 20%) = 12.500.
--
-- El admin sigue escribiendo "precio" (de costo) y "margen_pct" como siempre; la columna
-- nueva "precio_final" se calcula sola y es la que se muestra en catálogo, carrito y facturas.
--
-- margen_pct ya no puede llegar a 100 (dividir entre 1-100% sería dividir entre cero).
-- Si este bloque falla al crear la restricción, revisa si algún producto ya tiene
-- margen_pct = 100 y bájalo manualmente antes de volver a ejecutar.
--
-- No hace falta tocar la columna "ganancia" de items_pedido: sigue siendo
-- subtotal * margen_pct / 100, y con el subtotal basado ahora en precio_final, ya calcula
-- sola la ganancia nueva (precio_final - precio de costo). Tampoco hay que tocar las
-- funciones de ganancias: siguen sumando items_pedido.ganancia y ya quedan correctas.

alter table public.productos
  drop constraint if exists productos_margen_pct_check;

alter table public.productos
  add constraint productos_margen_pct_check check (margen_pct >= 0 and margen_pct < 100);

alter table public.productos
  add column if not exists precio_final numeric(12,2)
  generated always as (
    case when margen_pct >= 100 then null else round(precio / (1 - margen_pct / 100.0), 2) end
  ) stored;

-- Reemplaza crear_pedido para que el pedido se cree con el precio final (al público),
-- no con el precio de costo.
create or replace function public.crear_pedido(p_items jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_alfabeto constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_id text;
  v_esperados int;
  v_insertados int;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'El carrito está vacío';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_items) x
    where (x->>'cantidad')::int is null or (x->>'cantidad')::int < 1
  ) then
    raise exception 'Cantidad inválida';
  end if;

  loop
    v_id := '';
    for n in 1..4 loop
      v_id := v_id || substr(v_alfabeto, 1 + floor(random() * length(v_alfabeto))::int, 1);
    end loop;
    begin
      insert into pedidos (id) values (v_id);
      exit;
    exception when unique_violation then
      null;
    end;
  end loop;

  select count(distinct x->>'producto_id') into v_esperados
  from jsonb_array_elements(p_items) x;

  insert into items_pedido (pedido_id, producto_id, nombre_producto, precio_unitario, cantidad, subtotal, margen_pct)
  select v_id, p.id, p.nombre, p.precio_final, g.cantidad, p.precio_final * g.cantidad, p.margen_pct
  from (
    select (x->>'producto_id')::uuid as producto_id, sum((x->>'cantidad')::int)::int as cantidad
    from jsonb_array_elements(p_items) x
    group by 1
  ) g
  join productos p on p.id = g.producto_id and p.activo;

  get diagnostics v_insertados = row_count;
  if v_insertados <> v_esperados then
    raise exception 'Hay productos no disponibles';
  end if;

  update pedidos
  set total = (select coalesce(sum(subtotal), 0) from items_pedido where pedido_id = v_id)
  where id = v_id;

  return v_id;
end;
$$;

-- ============ CATEGORÍA, MARCA Y PRINCIPIO ACTIVO (FILTROS) ============
-- Ejecuta solo este bloque si ya tienes todo lo anterior.
--
-- Qué hace: agrega 3 columnas a "productos" para poder filtrar el catálogo y el inventario:
-- 1) "categoria": 'drogueria' o 'tienda'. Obligatoria. Los productos existentes quedan en
--    'tienda' por defecto — entra a cada uno y ponle la categoría real.
-- 2) "marca": laboratorio o marca (ej. "Genfar"). Opcional, texto libre.
-- 3) "principio_activo": (ej. "Ibuprofeno"). Opcional, texto libre.
--
-- No hace falta tocar RLS: las políticas de "productos" ya cubren toda la tabla.
-- No hace falta tocar crear_pedido ni items_pedido: estos campos son solo informativos
-- del catálogo, no afectan precios ni facturas, así que no se "congelan" en el pedido.

alter table public.productos
  add column if not exists categoria text not null default 'tienda'
  check (categoria in ('drogueria', 'tienda'));

alter table public.productos
  add column if not exists marca text;

alter table public.productos
  add column if not exists principio_activo text;

-- ============ ETIQUETAS (UN PRODUCTO PUEDE TENER VARIAS) ============
-- Ejecuta solo este bloque si ya tienes el bloque anterior (categoría/marca/principio activo).
--
-- Reemplaza "categoria" (una sola, obligatoria) por "etiquetas" (un arreglo: ninguna, una o
-- varias por producto, opcional). Si ya tenías productos con "categoria" asignada, se migra
-- sola a la nueva columna antes de borrar la vieja, para no perder ese trabajo.
--
-- El filtro en Angular ahora es de selección múltiple: se usa un producto si tiene AL MENOS
-- una de las etiquetas que el usuario/admin seleccionó.

alter table public.productos
  add column if not exists etiquetas text[] not null default '{}'::text[]
  check (etiquetas <@ array['drogueria', 'tienda']::text[]);

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'productos' and column_name = 'categoria'
  ) then
    update public.productos
    set etiquetas = array[categoria]
    where categoria is not null and etiquetas = '{}'::text[];

    alter table public.productos drop column categoria;
  end if;
end $$;

-- ============ ETIQUETA "ALTOS COSTOS" ============
-- Ejecuta solo este bloque si ya tienes el bloque anterior de "etiquetas".
-- Amplía la lista de etiquetas permitidas para incluir "alto_costo" (manual, el admin la
-- marca a mano en el producto; no se calcula sola a partir del precio).

alter table public.productos
  drop constraint if exists productos_etiquetas_check;

alter table public.productos
  add constraint productos_etiquetas_check
  check (etiquetas <@ array['drogueria', 'tienda', 'alto_costo']::text[]);
