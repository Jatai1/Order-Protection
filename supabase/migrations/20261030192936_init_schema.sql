create table webhook_events(
    id uuid primary key default gen_random_uuid(),
    webhook_id text not null unique,
    topic text not null,
    shop_domain text not null, 
    payload jsonb,
    received_at timestamptz not null default now(),
    processed_at timestamptz 
);

create table protected_orders(
    id uuid primary key default gen_random_uuid(),
    shop_domain text not null,
    shopify_order_id text not null,
    order_name text not null,
    premium_amount numeric(10,2) not null,
    order_total numeric(10,2) not null,
    currency text not null,
    created_at timestamptz not null default now(),
    unique(shop_domain, shopify_order_id)
);

create table claims(
    id uuid primary key default gen_random_uuid(),
    protected_order_id uuid not null references protected_orders(id),
    shop_domain text not null,
    reason text not null,
    status text not null default 'open' check(status in ('open','approved','denied', 'paid')),
    amount_requested numeric(10,2) not null,
    amount_approved numeric(10,2) ,
    created_at timestamptz not null default now()
);

create table claim_events(
    id uuid primary key default gen_random_uuid(),
    claim_id uuid not null references claims(id),
    type text not null,
    from_status text ,
    to_status text not null,
    note text,
    actor text not null,
    created_at timestamptz not null default now()
);

alter table webhook_events enable row level security;
alter table protected_orders enable row level security;
alter table claims enable row level security;
alter table claim_events enable row level security;