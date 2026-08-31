# Memória do projeto — Mimos Helo Personalizados

> Documento de continuidade para futuras conversas e manutenções.
> Última atualização: 31 de agosto de 2026.
> Não registrar neste arquivo senhas, hashes, chaves de sessão, cookies ou tokens da Cloudflare.

## 1. Resumo executivo

O projeto é um catálogo online responsivo da **Mimos Helo Personalizados**, pensado para substituir catálogos montados manualmente no Canva.

A proprietária gerencia os produtos em uma área administrativa. O comprador acessa a vitrine, escolhe um produto, seleciona opções, preenche a personalização, monta uma seleção e envia o pedido pronto pelo WhatsApp.

O sistema não processa pagamento e não conclui uma compra automaticamente. Ele funciona como catálogo, configurador de produto e gerador de pedido/orçamento pelo WhatsApp.

## 2. Endereços e serviços

| Finalidade | Endereço ou recurso |
|---|---|
| Site oficial atual | <https://mimos-helo.pages.dev/> |
| Administração | <https://mimos-helo.pages.dev/admin> |
| Verificação da infraestrutura | <https://mimos-helo.pages.dev/api/health> |
| Repositório | <https://github.com/IgorJustino/Mimos-Helo> |
| Branch de produção | `main` |
| Projeto Cloudflare Pages | `mimos-helo` |
| Banco Cloudflare D1 | `mimos-helo-catalogo` |
| Bucket Cloudflare R2 | `mimos-helo-imagens` |
| Binding do banco | `DB` |
| Binding das imagens | `IMAGES` |
| WhatsApp comercial | `+55 61 99669-7056` |

O site está hospedado de verdade no **Cloudflare Pages**. Endereços como `09775322.mimos-helo.pages.dev` identificam um deploy específico e não devem ser divulgados como endereço principal.

O antigo endereço `mimos-helo.vercel.app` pertence à hospedagem anterior na Vercel e pode ficar desatualizado. O GitHub guarda o código; não é o backend nem o banco da aplicação.

Ainda não há domínio próprio confirmado neste histórico. Quando for adquirido, ele deve ser conectado ao projeto `mimos-helo` no Cloudflare Pages.

## 3. Stack atual

- HTML, CSS e JavaScript sem framework no frontend;
- Cloudflare Pages para os arquivos públicos;
- Cloudflare Pages Functions para a API serverless;
- Cloudflare D1 para produtos, autenticação e métricas agregadas;
- Cloudflare R2 para fotos de produtos;
- Wrangler para desenvolvimento, migrações e deploy;
- Google Chrome headless para testes funcionais e responsivos.

O projeto teve uma proposta anterior com Supabase e uma publicação na Vercel, mas essa arquitetura foi substituída. A implementação atual não depende de Supabase, Vercel, Locaweb, HostGator ou Hostinger.

## 4. Estrutura do repositório

```text
public/                         frontend publicado
  index.html                    vitrine
  admin.html                    área administrativa
  assets/css/base.css           tokens, reset e componentes compartilhados
  assets/css/storefront.css     estilos exclusivos da vitrine
  assets/css/admin.css          estilos exclusivos do painel
  assets/js/                    catálogo, carrinho, painel e cliente da API
  assets/images/brand/          marcas oficiais e imagem de compartilhamento
  assets/images/guide/          imagens institucionais do guia
functions/                      backend do Cloudflare Pages
  _shared/                      autenticação, HTTP, D1, R2 e métricas
  api/                          rotas públicas e administrativas
  media/                        entrega das imagens privadas do R2
database/
  migrations/                   esquema versionado do D1
  fixtures/                     dados somente para desenvolvimento local
tests/                          testes unitários e testes no navegador
docs/                           arquitetura, operação e esta memória
wrangler.jsonc                  configuração D1, R2 e Pages
```

Arquivos antigos e pastas legadas de Supabase, migrações duplicadas, imagens de produto embutidas e catálogos estáticos foram removidos. Diretórios vazios não são versionados pelo Git.

## 5. Funcionamento da vitrine

1. `public/assets/js/catalog-api.js` consulta `GET /api/products`.
2. A API lê do D1 somente produtos com `published = 1`.
3. `public/assets/js/storefront.js` renderiza os cartões, a busca e os filtros de categoria.
4. O comprador pode buscar sem depender de acentos, filtrar, abrir detalhes ou personalizar o produto.
5. As escolhas e os dados de personalização ficam somente no `sessionStorage` e na memória do navegador.
6. O comprador altera quantidades e revisa a seleção no carrinho lateral.
7. Ao clicar em enviar, o navegador monta uma mensagem e abre `wa.me` com o pedido preenchido.

Se o banco estiver corretamente acessível, mas não tiver produtos publicados, a vitrine mostra um estado vazio. Não existe fallback de produtos fixos no frontend; o D1 é a única fonte de verdade do catálogo.

O código da vitrine é encapsulado em uma IIFE. Estado do catálogo, carrinho e funções internas não ficam disponíveis no escopo global do navegador.

### Funcionalidades presentes

- layout responsivo para desktop e smartphones;
- hero institucional com o monograma oficial;
- carrossel informativo acima da seção de produtos;
- busca por produto, descrição, opções, detalhes e categoria;
- atalhos e filtros por categoria com compatibilidade para categorias legadas;
- detalhes do produto em modal;
- formulário de personalização configurável por produto;
- opções com preços e descrições diferentes;
- carrinho/seleção com quantidades e edição da personalização;
- mensagem de WhatsApp com itens, opções, personalizações e subtotal de referência;
- lightbox para ampliar imagens do guia;
- estados de carregamento, catálogo vazio e erro de conexão;
- navegação por teclado, foco visível e adaptação mobile.

### Personalização

O painel permite criar campos dos tipos:

- texto curto;
- texto longo;
- lista de escolhas;
- número;
- data;
- telefone.

Campos identificados como nome são sempre exibidos como texto na vitrine, mesmo que tenham sido cadastrados equivocadamente como número. Essa proteção corrigiu o problema em que o nome para a capa não aceitava letras.

## 6. Área administrativa

A administração fica em `/admin` e permite:

- cadastrar, editar e excluir produtos;
- publicar ou ocultar produtos;
- definir nome, descrição, preço, categoria, etiqueta e ordem;
- enviar e substituir a foto;
- cadastrar opções, preços por opção e explicações;
- criar os campos de personalização que o comprador preencherá;
- definir detalhes, avisos e observações;
- acompanhar o funil anônimo dos últimos 30 dias.

Alterações de produtos feitas no painel entram diretamente no D1 e aparecem na vitrine sem commit ou novo deploy.

### Compressão de imagens

Antes do upload, o navegador:

- aceita JPG, PNG e WebP;
- aceita um arquivo original de até 20 MB;
- limita a maior dimensão a 1.800 px;
- tenta gerar WebP otimizado;
- reduz dimensões e qualidade progressivamente até ficar abaixo de 5 MB;
- mantém o original quando ele já é menor e a conversão não oferece vantagem.

A API rejeita uploads finais acima de 5 MB ou com formato não permitido.

## 7. Armazenamento de imagens no R2

O fluxo evita imagens órfãs:

1. `POST /api/admin/images` grava a nova imagem em `pending/`.
2. A administradora termina de preencher e salva o produto.
3. `POST /api/admin/products` copia a imagem para `catalogo/` somente quando o produto será persistido.
4. Depois da gravação bem-sucedida no D1, a cópia em `pending/` é apagada.
5. Se a gravação falhar, a nova cópia permanente é removida por compensação.
6. Ao substituir uma foto ou excluir um produto, a imagem permanente anterior é removida.

O bucket possui a regra `delete-pending-uploads`, com prefixo exclusivo `pending/` e expiração depois de um dia. Ela não afeta `catalogo/`.

As imagens são privadas no R2 e entregues por `GET /media/{caminho}`, com `ETag`, `nosniff` e cache imutável de um ano.

## 8. Banco Cloudflare D1

As migrações são incrementais e ficam em `database/migrations/`. Nunca alterar uma migração que já foi aplicada; criar uma nova migração numerada.

### Tabelas

| Tabela | Responsabilidade |
|---|---|
| `products` | Produtos, preços, opções, personalização, publicação e caminhos de imagem |
| `admin_credentials` | Usuário, hash PBKDF2 e segredo de sessão da única conta administrativa |
| `admin_login_attempts` | Limite temporário de tentativas por IP |
| `analytics_daily_events` | Contagens diárias e anônimas do funil |

Não existe tabela de clientes, pedidos ou dados de personalização. Nome, telefone, diagnóstico, observações e outros dados preenchidos pelo comprador não são enviados ao D1.

O arquivo `database/fixtures/demo-products.sql` é exclusivamente local. **Nunca executar o seed de demonstração no banco remoto**, pois produção deve ser administrada pelo painel.

## 9. Autenticação e segurança

- a credencial administrativa é armazenada no D1, nunca no frontend;
- a senha não é armazenada em texto puro: usa PBKDF2-SHA-256;
- a sessão é assinada com HMAC-SHA-256;
- o cookie é `HttpOnly`, `Secure` e `SameSite=Strict`;
- a sessão expira em oito horas;
- o login aceita no máximo oito falhas na janela de 15 minutos por IP;
- login bem-sucedido limpa as falhas daquele IP;
- rotas `/api/admin/*`, exceto login, exigem sessão válida;
- respostas administrativas usam `Cache-Control: no-store`;
- não copiar credenciais, hashes, segredos ou tokens para documentação ou commits.

O loop de redirecionamentos da página administrativa foi removido. O acesso atual acontece na mesma origem, em `/admin`, usando a sessão protegida da API.

## 10. Métricas de conversão

A vitrine envia eventos para `POST /api/telemetry`:

| Evento | Momento |
|---|---|
| `catalog_view` | primeira abertura do catálogo na sessão |
| `product_view` | primeira abertura de cada produto na sessão |
| `cart_add` | nova adição de um produto à seleção |
| `whatsapp_click` | clique para abrir a conversa com o pedido |

O endpoint aceita somente esses nomes e, quando necessário, slugs de produtos publicados. São gravadas contagens agregadas por data e produto, não eventos individuais com identificação.

Não são enviados nome, telefone, valores digitados nos campos, conteúdo do carrinho ou mensagem do WhatsApp.

O painel consulta `GET /api/admin/analytics?days=30` e mostra uma jornada visual: visita → produto aberto → seleção → WhatsApp, além da taxa de conversão e do produto com maior avanço.

A telemetria é opcional. Se `sendBeacon`, `fetch` ou `sessionStorage` forem bloqueados, o catálogo e o carrinho continuam funcionando. Essa proteção foi adicionada depois que uma falha de telemetria fez um navegador mostrar incorretamente “Não foi possível abrir o catálogo”, embora o produto continuasse no D1.

## 11. Rotas da API

| Método | Rota | Acesso | Função |
|---|---|---|---|
| GET | `/api/health` | público | informa se D1 e R2 estão conectados |
| GET | `/api/products` | público | lista produtos publicados |
| POST | `/api/telemetry` | público, mesma origem | soma evento anônimo permitido |
| POST | `/api/admin/login` | público com limite | autentica a administração |
| POST | `/api/admin/logout` | público | encerra o cookie de sessão |
| GET | `/api/admin/me` | administrativo | retorna a sessão atual |
| GET | `/api/admin/products` | administrativo | lista todos os produtos |
| POST | `/api/admin/products` | administrativo | cria ou atualiza produto |
| DELETE | `/api/admin/products/{id}` | administrativo | exclui produto e sua imagem |
| POST | `/api/admin/images` | administrativo | envia imagem temporária |
| GET | `/api/admin/analytics` | administrativo | retorna o funil agregado |
| GET | `/media/{caminho}` | público | entrega imagem do R2 |

## 12. Design e materiais originais

A skill `frontend-design`, proveniente de `anthropics/skills`, está registrada em `skills-lock.json` e em `.agents/skills/frontend-design/`. Ela orientou o visual para não parecer um template genérico.

Em 31/08/2026, a identidade foi atualizada a partir do **Manual Definitivo do Catálogo Digital Mimos Helo V3**, do **Catálogo Digital Mimos Helo** e das marcas oficiais fornecidas pela cliente. Esses documentos foram tratados como referência visual e de conteúdo; propostas futuras presentes neles não foram interpretadas automaticamente como requisitos de banco ou backend.

Direção oficial atual:

- Azul Tinta `#1B3A5C` como cor principal de marca, cabeçalhos e ações;
- Porcelana `#F5F0EB` como base, Rosé Seco `#D4A5A5`, Lavanda `#C8B8D4` e Sálvia `#A8C0A0` como apoios;
- Grafite `#2D2D2D` para texto;
- títulos editoriais com Cormorant Garamond;
- corpo, formulários e interface com Inter;
- logotipo oficial usado como imagem — não reconstruir o nome com fonte de texto;
- monograma oficial como assinatura do hero e marca de acesso do painel;
- slogan principal: “Ideias que ganham forma, detalhes que encantam.”;
- vitrine em quatro colunas no desktop, duas no smartphone e uma somente em larguras muito estreitas;
- painel com trilho lateral Azul Tinta e área de edição clara;
- painel de métricas desenhado como o caminho real até o WhatsApp.
- categorias apresentadas como escolhas, sem numeração decorativa;
- cinco gradientes intencionais em toda a interface pública e nenhum no painel administrativo;
- metadados Open Graph e Twitter Card usando a marca oficial.

### Organização dos estilos

- `base.css` contém somente tokens, reset, acessibilidade, botões e marca compartilhados;
- `storefront.css` não contém mais a camada visual anterior nem seletores sem uso;
- `admin.css` é independente da vitrine e mantém apenas os componentes do painel;
- em 31/08/2026, a limpeza reduziu `storefront.css` de 3.623 para menos de 700 linhas e `admin.css` de 1.536 para menos de 350 linhas;
- a quantidade de funções de gradiente caiu de 36 para 5, preservando apenas placeholder, legibilidade sobre imagens, encadernação e assinatura da marca.

Arquivos de marca publicados:

- `public/assets/images/brand/mimos-helo-logo.png`: logotipo horizontal oficial;
- `public/assets/images/brand/mimos-helo-monogram.png`: monograma transparente;
- `public/assets/images/brand/mimos-helo-social.png`: versão em fundo Porcelana para metadados sociais.

O usuário forneceu PDFs e imagens do WhatsApp como referência inicial, incluindo artes de caderneta, catálogo de festas, acabamento BOPP, prazos, entrega, reforma luxo, crachá inclusivo e adicionais. As imagens institucionais aproveitadas estão organizadas em `public/assets/images/guide/`. Fotos de produtos não devem ser copiadas para essa pasta: pertencem ao R2.

## 13. Desenvolvimento local

Pré-requisitos: Node.js, npm, Google Chrome e autenticação válida do Wrangler quando for acessar recursos remotos.

```bash
npm install
npm run db:migrate:local
npm run db:seed:local
npm run dev
```

Abrir <http://localhost:4173>.

### Testes

Com o servidor local ativo:

```bash
npm test
```

A suíte executa:

- validação do repositório de produtos;
- promoção de imagens e telemetria;
- smoke test da vitrine em Chrome;
- smoke test do painel em Chrome;
- personalização, edição e WhatsApp;
- carrossel e arquivos públicos;
- compressão de imagem;
- desktop e larguras móveis de 320, 360, 390 e 430 px;
- funcionamento com telemetria e `sessionStorage` bloqueados.

## 14. Processo de publicação

Este projeto Cloudflare Pages usa **Direct Upload**. Enviar para o GitHub não publica sozinho.

Para mudança apenas de código:

```bash
git add <arquivos>
git commit -m "descrição da mudança"
git push origin main
npm run deploy
```

Quando houver nova migração:

```bash
npm test
git add <arquivos>
git commit -m "descrição da mudança"
npm run db:migrate:remote
git push origin main
npm run deploy
```

Aplicar a migração remota antes do código que depende dela. Confirmar depois:

```bash
curl https://mimos-helo.pages.dev/api/health
curl https://mimos-helo.pages.dev/api/products
```

Edições de produtos pelo `/admin` não precisam de Git ou deploy.

## 15. Histórico consolidado do trabalho

| Commit | Mudança principal |
|---|---|
| `dd4a1ab` | primeira vitrine responsiva e catálogo visual |
| `91b41dc` | gestão online do catálogo |
| `3bda350` | migração para Cloudflare D1 e R2 |
| `78bdb5d` | runtime compatível com Pages |
| `65de068` | documentação da publicação Cloudflare |
| `7f4971a` | correção do redirecionamento excessivo no admin |
| `ee367f9` | credenciais seguras para o painel |
| `22633e0` | credenciais movidas para D1 privado |
| `9a41ad3` | compressor de imagens e correção de campos de nome |
| `ee3246c` | remoção de produtos fixos; catálogo passa a vir apenas do banco |
| `bf3459a` | reorganização da arquitetura, arquivos e banco |
| `d9b5c66` | lifecycle seguro de imagens e métricas de conversão |
| `77b94da` | telemetria isolada para nunca bloquear o catálogo |

Além dos commits, foram realizados durante a conversa:

- instalação e uso da skill Frontend Design;
- inclusão do carrossel informativo na parte superior, antes dos produtos;
- adaptação completa para smartphones;
- atualização da vitrine e do painel para a identidade oficial Azul Tinta/Porcelana;
- inclusão do logotipo e monograma oficiais sem recriá-los em texto;
- busca de produtos sem dependência de acentos e categorias oficiais com compatibilidade legada;
- consolidação do CSS em base compartilhada, vitrine e painel independentes;
- remoção de código visual legado, numeração decorativa e gradientes sem função;
- encapsulamento do JavaScript da vitrine em IIFE;
- personalização obrigatória antes de adicionar produtos à seleção;
- geração do pedido pelo WhatsApp;
- conexão do repositório GitHub e trabalho na `main`;
- orientação inicial sobre Vercel e posterior consolidação na Cloudflare;
- substituição da proposta Supabase pela arquitetura D1/R2;
- criação do painel administrativo dinâmico;
- limpeza de arquivos e pastas legadas;
- separação entre imagens institucionais e fotos de produtos;
- ciclo seguro `pending/` → `catalogo/` no R2;
- métricas anônimas de conversão;
- correção da falsa mensagem de erro do catálogo sem apagar o produto.

## 16. Estado verificado em 31/08/2026

- `https://mimos-helo.pages.dev/api/health` respondeu `configured: true`;
- o provedor informado foi Cloudflare, com D1 e R2 conectados;
- a API pública retornou um produto publicado: `copo bucks personalizado`;
- a branch local e remota estavam em `77b94da` antes da criação desta memória;
- o worktree estava limpo antes deste arquivo;
- a consulta pública funcionou normalmente;
- a autenticação local do Wrangler para consultas remotas retornou erro Cloudflare `7403` nesta data. Se for necessário migrar, consultar D1/R2 ou publicar novamente, executar `npx wrangler login` e confirmar que a conta autorizada é a proprietária dos recursos.

O número de produtos e as métricas são dados dinâmicos. Sempre consultar a API ou o painel antes de afirmar o estado atual.

## 17. Regras para futuras manutenções

1. Preservar os dados existentes do D1 e os objetos em `catalogo/`.
2. Nunca executar fixture/seed no banco remoto.
3. Nunca voltar a embutir produtos no HTML ou JavaScript.
4. Manter dados pessoais do comprador fora do backend e da telemetria.
5. Toda nova foto começa em `pending/`; somente produto salvo usa `catalogo/`.
6. Telemetria nunca pode impedir catálogo, personalização, carrinho ou WhatsApp.
7. Criar novas migrações; não reescrever migrações aplicadas.
8. Executar `npm test` antes de commit e deploy.
9. Testar pelo menos 320 px e 390 px quando alterar interface.
10. Verificar `/api/health`, `/api/products` e a página pública depois do deploy.
11. Não registrar segredos no Git, documentação, mensagens de commit ou logs compartilhados.
12. Antes de mudar hospedagem ou banco, confirmar se a mudança preserva D1, R2, autenticação, rotas e fluxo do painel.

## 18. Pendências e decisões futuras

- comprar e conectar um domínio próprio, se a cliente aprovar;
- confirmar periodicamente acesso à conta Cloudflare e renovar o login do Wrangler;
- definir uma rotina de backup/exportação do D1 antes de mudanças estruturais;
- acompanhar limites e custos da faixa gratuita conforme o tráfego crescer;
- considerar pedidos persistentes ou pagamento online somente se a cliente mudar o escopo — atualmente o WhatsApp é o fechamento intencional do fluxo.

## 19. Documentos relacionados

- [README principal](../README.md)
- [Arquitetura](ARQUITETURA.md)
- [Configuração do catálogo na Cloudflare](CONFIGURAR-CATALOGO.md)
- [Banco de dados](../database/README.md)
