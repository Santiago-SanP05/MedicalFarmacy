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
