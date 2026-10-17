-- Paušalac asistent: šema baze. Pokreni u Supabase -> SQL Editor.

create table if not exists settings (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  data jsonb not null default '{}'
);

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  address text,
  tax_id text,
  country text,
  email text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists item_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  description text not null,
  unit text default 'kom',
  price numeric default 0,
  currency text default 'RSD',
  created_at timestamptz not null default now()
);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  number text not null,
  client_id uuid references clients on delete set null,
  client_snapshot jsonb,
  issue_date date not null,
  service_date date,
  due_date date,
  currency text not null default 'RSD',
  exchange_rate numeric not null default 1,
  items jsonb not null default '[]',
  total numeric not null default 0,
  amount_rsd numeric not null default 0,
  status text not null default 'draft', -- draft | sent | paid | cancelled
  paid_date date,
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, number)
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  category text,
  description text,
  amount numeric not null default 0,
  currency text not null default 'RSD',
  exchange_rate numeric not null default 1,
  amount_rsd numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  kind text,
  amount numeric not null default 0,
  note text,
  created_at timestamptz not null default now()
);

-- Row Level Security: svako vidi samo svoje podatke
do $$
declare t text;
begin
  foreach t in array array['settings','clients','item_templates','invoices','expenses','payments'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "own rows" on %I', t);
    execute format('create policy "own rows" on %I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;
