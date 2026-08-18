-- Mimos Helo — banco do catálogo e políticas de segurança
-- Execute este arquivo uma única vez no SQL Editor do Supabase.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id text primary key default gen_random_uuid()::text,
  slug text not null unique,
  category text not null default 'outros',
  badge text not null default '',
  meta text not null default '',
  name text not null,
  short_name text not null default '',
  price numeric(10, 2) not null default 0 check (price >= 0),
  price_note text not null default '',
  image_url text not null default '',
  image_path text not null default '',
  image_alt text not null default '',
  description text not null default '',
  option_label text not null default 'Opção',
  options jsonb not null default '[]'::jsonb check (jsonb_typeof(options) = 'array'),
  option_prices jsonb not null default '[]'::jsonb check (jsonb_typeof(option_prices) = 'array'),
  option_descriptions jsonb not null default '[]'::jsonb check (jsonb_typeof(option_descriptions) = 'array'),
  customization_fields jsonb not null default '[]'::jsonb check (jsonb_typeof(customization_fields) = 'array'),
  customization_notice text not null default '',
  details jsonb not null default '[]'::jsonb check (jsonb_typeof(details) = 'array'),
  note text not null default '',
  published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create or replace function public.is_catalog_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_catalog_admin() from public;
grant execute on function public.is_catalog_admin() to authenticated;

grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant select on public.admin_users to authenticated;

alter table public.products enable row level security;
alter table public.admin_users enable row level security;

drop policy if exists "Produtos publicados podem ser vistos" on public.products;
create policy "Produtos publicados podem ser vistos"
on public.products for select
to anon, authenticated
using (published = true);

drop policy if exists "Administradores podem ver todos os produtos" on public.products;
create policy "Administradores podem ver todos os produtos"
on public.products for select
to authenticated
using ((select public.is_catalog_admin()));

drop policy if exists "Administradores podem cadastrar produtos" on public.products;
create policy "Administradores podem cadastrar produtos"
on public.products for insert
to authenticated
with check ((select public.is_catalog_admin()));

drop policy if exists "Administradores podem atualizar produtos" on public.products;
create policy "Administradores podem atualizar produtos"
on public.products for update
to authenticated
using ((select public.is_catalog_admin()))
with check ((select public.is_catalog_admin()));

drop policy if exists "Administradores podem excluir produtos" on public.products;
create policy "Administradores podem excluir produtos"
on public.products for delete
to authenticated
using ((select public.is_catalog_admin()));

drop policy if exists "Administrador pode confirmar o próprio acesso" on public.admin_users;
create policy "Administrador pode confirmar o próprio acesso"
on public.admin_users for select
to authenticated
using (user_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Administradores podem listar imagens" on storage.objects;
create policy "Administradores podem listar imagens"
on storage.objects for select
to authenticated
using (bucket_id = 'product-images' and (select public.is_catalog_admin()));

drop policy if exists "Administradores podem enviar imagens" on storage.objects;
create policy "Administradores podem enviar imagens"
on storage.objects for insert
to authenticated
with check (bucket_id = 'product-images' and (select public.is_catalog_admin()));

drop policy if exists "Administradores podem atualizar imagens" on storage.objects;
create policy "Administradores podem atualizar imagens"
on storage.objects for update
to authenticated
using (bucket_id = 'product-images' and (select public.is_catalog_admin()))
with check (bucket_id = 'product-images' and (select public.is_catalog_admin()));

drop policy if exists "Administradores podem excluir imagens" on storage.objects;
create policy "Administradores podem excluir imagens"
on storage.objects for delete
to authenticated
using (bucket_id = 'product-images' and (select public.is_catalog_admin()));

insert into public.products (
  id, slug, category, badge, meta, name, short_name, price, price_note,
  image_url, image_alt, description, option_label, options, option_prices,
  option_descriptions, customization_fields, customization_notice, details,
  note, published, sort_order
)
values
(
  'reforma-luxo', 'reforma-luxo', 'cadernetas', 'Mais escolhido', 'Caderneta de saúde',
  'Reforma luxo', '', 70, 'Pix/dinheiro', 'assets/images/reforma-luxo.jpeg',
  'Reforma luxo de duas cadernetas de saúde personalizadas',
  'Capa nova e completa, mantendo o miolo original da caderneta do bebê.',
  'Acabamento da capa',
  '["Brilhante", "Fosco", "Holográfico caquinho", "Holográfico confete"]'::jsonb,
  '[]'::jsonb,
  '["Cores vibrantes, alto brilho e proteção.", "Toque suave, aveludado e elegante.", "Fragmentos de brilho que mudam com a luz.", "Partículas delicadas e reluzentes."]'::jsonb,
  '[{"id":"coverName","label":"Nome para colocar na capa","type":"text","placeholder":"Ex.: João Gabriel","required":true},{"id":"themeReference","label":"Tema ou referência do catálogo","type":"text","placeholder":"Ex.: Ursinho príncipe, referência 1A22","required":true},{"id":"wireColor","label":"Preferência de cor do wire-o","type":"select","options":["Sem preferência","Branco","Rosa","Cobre"],"required":false},{"id":"notes","label":"Observações ou preferências adicionais","type":"textarea","placeholder":"Ex.: detalhes de cor ou nome do pingente","required":false}]'::jsonb,
  'A reforma troca a capa e preserva o miolo original da caderneta.',
  '["Capa dura personalizada com arte do catálogo","Wire-o premium conforme disponibilidade","Elástico, passante, tassel ou pingente","Divisórias, bolso interno e folhas adicionais","Laminação brilhante, fosca ou holográfica","Cartão do SUS no mesmo tema como brinde"]'::jsonb,
  'Prazo estimado de 1 a 10 dias úteis, conforme a agenda. No cartão: R$ 75,00.', true, 10
),
(
  'cracha-inclusivo', 'cracha-inclusivo', 'identificacao', 'Produção em 2 dias', 'Identificação inclusiva',
  'Crachá para autismo e outras necessidades', 'Crachá inclusivo', 35, 'cordão incluso',
  'assets/images/cracha-autismo.jpeg', 'Frente e verso de crachá de identificação para autismo',
  'Polímero sublimado, mais grosso que PVC, resistente e à prova d’água.', 'Acabamento',
  '["Brilhante", "Fosco", "Holográfico caquinho", "Holográfico confete"]'::jsonb,
  '[]'::jsonb,
  '["Cores vibrantes, alto brilho e proteção.", "Toque suave, aveludado e elegante.", "Fragmentos de brilho que mudam com a luz.", "Partículas delicadas e reluzentes."]'::jsonb,
  '[{"id":"fullName","label":"Nome completo da pessoa","type":"text","placeholder":"Ex.: Lucas Gabriel da Silva","required":true},{"id":"birthDate","label":"Data de nascimento","type":"date","required":true},{"id":"responsibleName","label":"Nome do responsável","type":"text","placeholder":"Ex.: Maria das Graças Silva","required":true},{"id":"responsiblePhone","label":"Telefone do responsável com DDD","type":"tel","placeholder":"Ex.: (61) 99999-8888","required":true},{"id":"diagnosis","label":"CID, diagnóstico ou laudo","type":"text","placeholder":"Ex.: CID 10: F84.0","required":true},{"id":"notes","label":"Observações ou preferências adicionais","type":"textarea","placeholder":"Ex.: prefiro detalhes azuis","required":false}]'::jsonb,
  'Após enviar o pedido pelo WhatsApp, mande também uma foto nítida, de preferência com fundo branco.',
  '["Inclui cordão de Autismo","Enviar nome e data de nascimento","Enviar contato de um responsável","Enviar CID ou laudo","Enviar foto nítida com fundo branco","Produção em até 2 dias úteis"]'::jsonb,
  'Pagamento de 50% antecipado para confirmar. Modelo padrão, sem QR Code ou campos extras.', true, 20
),
(
  'kit-classico', 'kit-classico', 'festas', 'Pedido mínimo', 'Papelaria para festas',
  'Monte seu kit clássico', '', 35, 'kit 10 un. no Pix', 'assets/images/kit-classico.jpg',
  'Modelos e preços do kit clássico para festas',
  'Caixinhas em papel offset fosco, com modelos à sua escolha e impressão em alta qualidade.',
  'Tamanho do kit',
  '["10 unidades — até 2 modelos", "15 unidades — até 3 modelos", "20 unidades — até 4 modelos"]'::jsonb,
  '[35, 51, 66]'::jsonb,
  '["Escolha até 2 modelos diferentes.", "Escolha até 3 modelos diferentes.", "Escolha até 4 modelos diferentes."]'::jsonb,
  '[{"id":"themeReference","label":"Tema ou referência do catálogo","type":"text","placeholder":"Ex.: Safari, página 12","required":true},{"id":"nameAndAge","label":"Nome e idade para personalização","type":"text","placeholder":"Ex.: Helena, 5 anos","required":true},{"id":"eventDate","label":"Data do evento","type":"date","required":true},{"id":"notes","label":"Observações ou preferências adicionais","type":"textarea","placeholder":"Ex.: cores preferidas ou mensagem","required":false}]'::jsonb,
  'Personalizados não acompanham guloseimas, apliques 3D ou laços.',
  '["Modelos variados de caixinhas","Pedido mínimo de 5 unidades por modelo","Papel offset fosco 180 g","Impressão em alta qualidade","Kit 15: R$ 51 no Pix","Kit 20: R$ 66 no Pix"]'::jsonb,
  'Valores no cartão e outras combinações estão no catálogo completo de festas.', true, 30
),
(
  'kit-luxo', 'kit-luxo', 'festas', 'Com laço e 3D', 'Papelaria para festas',
  'Monte seu kit luxo', '', 50, 'kit 10 un. no Pix', 'assets/images/kit-luxo.jpg',
  'Modelos e preços do kit luxo para festas',
  'Caixinhas com aplique 3D e laço, personalizadas no tema da sua comemoração.',
  'Tamanho do kit',
  '["10 unidades — até 2 modelos", "15 unidades — até 3 modelos", "20 unidades — até 4 modelos"]'::jsonb,
  '[50, 74, 98]'::jsonb,
  '["Até 2 modelos com aplique e laço.", "Até 3 modelos com aplique e laço.", "Até 4 modelos com aplique e laço."]'::jsonb,
  '[{"id":"themeReference","label":"Tema ou referência do catálogo","type":"text","placeholder":"Ex.: Safari, página 12","required":true},{"id":"nameAndAge","label":"Nome e idade para personalização","type":"text","placeholder":"Ex.: Helena, 5 anos","required":true},{"id":"eventDate","label":"Data do evento","type":"date","required":true},{"id":"notes","label":"Observações ou preferências adicionais","type":"textarea","placeholder":"Ex.: cores preferidas ou mensagem","required":false}]'::jsonb,
  'Personalizados não acompanham guloseimas. Confirme o tema antes da produção.',
  '["Caixinhas variadas e maletinhas","Pedido mínimo de 5 unidades por modelo","Papel offset fosco 180 g","Inclui aplique 3D e laço","Kit 15: R$ 74 no Pix","Kit 20: R$ 98 no Pix"]'::jsonb,
  'Personalizados não acompanham guloseimas. Consulte os valores no cartão.', true, 40
),
(
  'kit-caixinhas', 'kit-caixinhas', 'festas', 'Kit completo', 'Papelaria para festas',
  'Kit caixinhas clássicas', '', 65, 'kit 1 no Pix', 'assets/images/kit-caixinhas.jpg',
  'Kits de caixinhas clássicas para festas',
  'Combinações prontas de caixinhas com topos de docinhos como brinde.', 'Opção',
  '["Kit 1 — 20 itens + 10 brindes", "Kit 2 — 40 itens + 15 brindes", "Kit 3 — 60 itens + 24 brindes"]'::jsonb,
  '[65, 130, 190]'::jsonb,
  '["20 caixinhas e 10 topos.", "40 caixinhas e 15 topos.", "60 caixinhas e 24 topos."]'::jsonb,
  '[{"id":"themeReference","label":"Tema ou referência do catálogo","type":"text","placeholder":"Ex.: Safari, página 12","required":true},{"id":"nameAndAge","label":"Nome e idade para personalização","type":"text","placeholder":"Ex.: Helena, 5 anos","required":true},{"id":"eventDate","label":"Data do evento","type":"date","required":true},{"id":"notes","label":"Observações ou preferências adicionais","type":"textarea","placeholder":"Ex.: cores preferidas ou mensagem","required":false}]'::jsonb,
  'A composição dos kits é fixa e os personalizados não acompanham guloseimas.',
  '["Kit 1: 20 caixinhas e 10 topos","Kit 2: 40 caixinhas e 15 topos","Kit 3: 60 caixinhas e 24 topos","Impressão em alta qualidade","Sem aplique 3D ou laços","A composição não pode ser alterada"]'::jsonb,
  'Personalizados não acompanham guloseimas. Consulte os valores no cartão.', true, 50
),
(
  'adicionais', 'adicionais', 'acabamentos', 'A partir de R$ 5', 'Encadernação',
  'Adicionais para personalizar', '', 5, 'a partir de', 'assets/images/adicionais.jpeg',
  'Lista de adicionais disponíveis para encadernações',
  'Pequenos detalhes para deixar agendas, cadernetas e planners ainda mais especiais.',
  'Adicional',
  '["Tassel ou pingente", "Bolso canguru", "Divisórias", "Wire-o", "Laminação holográfica", "Cartão do SUS", "Chaveiro", "Passante"]'::jsonb,
  '[5, 5, 8, 5, 10, 10, 5, 5]'::jsonb,
  '["Pingente para combinar com o tema.", "Bolso transparente para documentos.", "Divisórias personalizadas.", "Branco, rosa ou cobre.", "Efeito holográfico na capa.", "Cartão no mesmo tema.", "Chaveiro polasseal.", "Passante metálico decorativo."]'::jsonb,
  '[{"id":"targetProduct","label":"Em qual produto será aplicado?","type":"text","placeholder":"Ex.: reforma de caderneta","required":true},{"id":"themeReference","label":"Tema ou referência","type":"text","placeholder":"Ex.: mesmo tema da caderneta","required":false},{"id":"notes","label":"Observações ou preferência de cor","type":"textarea","placeholder":"Ex.: wire-o cobre ou tassel rosa","required":false}]'::jsonb,
  'Cores e modelos dependem da disponibilidade no momento do pedido.',
  '["Tassel ou pingente: R$ 5","Bolso canguru: R$ 5","Divisórias: R$ 8","Wire-o: R$ 5","Laminação holográfica: R$ 10","Cartão do SUS: R$ 10","Chaveiro ou passante: R$ 5"]'::jsonb,
  'Consulte a disponibilidade das cores de wire-o.', true, 60
)
on conflict (id) do nothing;

-- Depois de criar a usuária em Authentication > Users, torne-a administradora:
-- insert into public.admin_users (user_id)
-- select id from auth.users where lower(email) = lower('EMAIL_DA_CLIENTE')
-- on conflict (user_id) do nothing;
