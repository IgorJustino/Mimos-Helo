# Arquitetura do projeto

O projeto segue uma separação simples por responsabilidade:

```text
public/                 site publicado pela Cloudflare Pages
  assets/css/base.css   tokens, reset e componentes realmente compartilhados
  assets/css/storefront.css estilos exclusivos da vitrine
  assets/css/admin.css  estilos exclusivos do painel
  assets/js/            interface pública, painel e cliente da API
  assets/images/guide/  imagens institucionais do guia de compra
functions/              API executada pelo Cloudflare Pages Functions
  _shared/              autenticação, HTTP, armazenamento e acesso ao D1
  api/                   rotas JSON públicas e administrativas
  media/                 leitura das imagens privadas do R2
database/
  migrations/           única fonte de verdade para a estrutura do D1
  fixtures/             dados opcionais usados somente em desenvolvimento
tests/                   testes de navegação da vitrine e do painel
docs/                    operação, implantação e decisões de arquitetura
```

## Fluxo dos dados

1. A proprietária acessa `/admin` e salva um produto.
2. A foto comprimida é enviada para `pending/` no R2.
3. Ao salvar o produto no D1, a API promove a foto para `catalogo/` e apaga a cópia temporária.
4. A vitrine consulta `/api/products` e renderiza somente produtos publicados.
5. A personalização e o carrinho permanecem no `sessionStorage` da aba do comprador; não são gravados no D1 nem no R2.
6. Ao finalizar, o site monta a mensagem e abre o WhatsApp.
7. Eventos anônimos do funil são somados diariamente no D1 e aparecem no painel.

Produtos e fotos não possuem fallback no frontend. Se o D1 estiver vazio, a vitrine mostra o estado vazio. As imagens em `public/assets/images/guide` são conteúdo institucional fixo, não produtos.

O carrinho público usa uma gaveta responsiva de até 600 px, organizada em cabeçalho, lista rolável e resumo fixo. Em smartphones, ela ocupa toda a largura. Quantidade, preço, remoção e edição mantêm o índice original do item mesmo quando um produto salvo na sessão já não está disponível no catálogo.

## Fotos sem arquivos órfãos

Uploads novos começam no prefixo temporário `pending/`. A foto só ganha um endereço permanente em `catalogo/` depois que o produto é salvo com sucesso no D1. Se a janela for fechada ou a gravação falhar, uma regra de ciclo de vida do R2 remove o arquivo temporário depois de um dia. Fotos em `catalogo/` não entram nessa regra.

## Métricas sem dados pessoais

A vitrine envia somente o nome do evento e, quando aplicável, o identificador público do produto para `/api/telemetry`. Os eventos são:

- `catalog_view`: primeira visita da sessão;
- `product_view`: primeira abertura de cada produto na sessão;
- `cart_add`: adição de um produto à seleção;
- `whatsapp_click`: clique para abrir o pedido no WhatsApp.

Nome, telefone, escolhas de personalização, mensagem e conteúdo do carrinho não são registrados. O D1 guarda contagens agregadas por dia em `analytics_daily_events`; o resumo dos últimos 30 dias é restrito ao painel administrativo.

## Padrões

- arquivos públicos usam nomes em inglês e `kebab-case`;
- vitrine e painel compartilham somente `base.css`; o painel não carrega `storefront.css`;
- o JavaScript da vitrine fica encapsulado em IIFE e não cria estado global;
- gradientes são reservados para legibilidade ou assinatura visual, não para decoração genérica;
- módulos compartilhados da API ficam em `functions/_shared`;
- mudanças no esquema são novas migrações SQL; migrações já publicadas não são alteradas;
- dados de demonstração nunca ficam em migrações de produção;
- fotos de produtos pertencem ao R2 e são servidas por `/media`;
- uploads temporários pertencem a `pending/` e fotos confirmadas a `catalogo/`;
- respostas administrativas e o catálogo público usam `Cache-Control: no-store` para refletir alterações imediatamente;
- segredos e credenciais nunca são armazenados no Git.
