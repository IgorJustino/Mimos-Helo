# Arquitetura do projeto

O projeto segue uma separação simples por responsabilidade:

```text
public/                 site publicado pela Cloudflare Pages
  assets/css/           estilos da vitrine e do painel
  assets/js/            interface pública, painel e cliente da API
  assets/images/guide/  imagens institucionais do guia de compra
functions/              API executada pelo Cloudflare Pages Functions
  _shared/              autenticação, HTTP e acesso ao D1 compartilhados
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
2. A foto comprimida é enviada para o R2 e os dados são gravados no D1.
3. A vitrine consulta `/api/products` e renderiza somente produtos publicados.
4. A personalização e o carrinho permanecem no navegador do comprador.
5. Ao finalizar, o site monta a mensagem e abre o WhatsApp.

Produtos e fotos não possuem fallback no frontend. Se o D1 estiver vazio, a vitrine mostra o estado vazio. As imagens em `public/assets/images/guide` são conteúdo institucional fixo, não produtos.

## Padrões

- arquivos públicos usam nomes em inglês e `kebab-case`;
- módulos compartilhados da API ficam em `functions/_shared`;
- mudanças no esquema são novas migrações SQL; migrações já publicadas não são alteradas;
- dados de demonstração nunca ficam em migrações de produção;
- fotos de produtos pertencem ao R2 e são servidas por `/media`;
- respostas administrativas e o catálogo público usam `Cache-Control: no-store` para refletir alterações imediatamente;
- segredos e credenciais nunca são armazenados no Git.
