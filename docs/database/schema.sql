create table users (
  id uuid primary key,
  phone varchar(32) unique,
  email varchar(255) unique,
  password_hash text,
  status varchar(32) not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table categories (
  id uuid primary key,
  parent_id uuid references categories(id),
  name_uz varchar(255) not null,
  name_ru varchar(255),
  name_en varchar(255),
  slug varchar(255) unique not null,
  created_at timestamptz not null default now()
);

create table products (
  id uuid primary key,
  category_id uuid references categories(id),
  title_uz varchar(500) not null,
  title_ru varchar(500),
  description_uz text,
  description_ru text,
  currency char(3) not null default 'CNY',
  price_minor bigint not null,
  status varchar(32) not null default 'draft',
  supplier_product_ref varchar(255),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table orders (
  id uuid primary key,
  user_id uuid not null references users(id),
  status varchar(32) not null default 'created',
  currency char(3) not null default 'UZS',
  subtotal_minor bigint not null,
  delivery_minor bigint not null default 0,
  total_minor bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key,
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id),
  quantity integer not null check (quantity > 0),
  unit_price_minor bigint not null,
  created_at timestamptz not null default now()
);

create table payments (
  id uuid primary key,
  order_id uuid not null references orders(id),
  provider varchar(64) not null,
  provider_payment_ref varchar(255),
  status varchar(32) not null default 'pending',
  amount_minor bigint not null,
  currency char(3) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now();

create index idx_products_category on products(category_id);
create index idx_orders_user on orders(user_id);
create index idx_order_items_order on order_items(order_id);
create index idx_payments_order on payments(order_id);
