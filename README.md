# Mimos Helo Personalizados

Catálogo responsivo da Mimos Helo, com gestão de produtos, personalização dos itens, seleção e envio do orçamento pelo WhatsApp.

## Catálogo automático

O catálogo público carrega todos os produtos diretamente do Cloudflare D1 e as fotos do R2. A proprietária administra produtos, fotos, preços, opções e campos de personalização em `/admin`, sem editar código. O acesso administrativo usa credenciais armazenadas em uma tabela privada, senha protegida por hash e uma sessão em cookie seguro.

O banco armazena informações dos produtos e contagens anônimas do funil. Os dados preenchidos pelos compradores permanecem na sessão do navegador e são usados para montar a mensagem do WhatsApp; nome, telefone e personalizações não entram nas métricas.

Veja a [arquitetura](docs/ARQUITETURA.md) e o [passo a passo da Cloudflare](docs/CONFIGURAR-CATALOGO.md).

## Abrir localmente

Instale as ferramentas e prepare o banco local uma única vez:

```bash
npm install
npm run db:migrate:local
npm run db:seed:local
```

Para iniciar, execute `npm run dev` e abra `http://localhost:4173`.

## Atualizar o catálogo

- Cadastre e altere todos os produtos pela área administrativa em `/admin`.
- O número do WhatsApp fica em `public/assets/js/storefront.js`.
- As fotos enviadas pelo painel ficam no Cloudflare R2.
- O painel mostra o caminho entre visita, abertura de produto, seleção e clique no WhatsApp.

Os dados preenchidos na personalização ficam somente na sessão atual do navegador e são utilizados para montar a mensagem enviada ao WhatsApp.

## Publicar

O frontend não depende de framework. Na Cloudflare Pages, a pasta `functions` fornece a API, o D1 guarda o catálogo e o R2 guarda as fotos. A senha administrativa não é salva no código: somente seu hash fica em uma tabela privada do D1.

Depois de enviar as alterações para a `main`, publique o código com:

```bash
npm run deploy
```

Cadastros e edições feitos no painel são gravados diretamente no D1 e não precisam de novo deploy.

## Verificação

Com o servidor local ativo e o Google Chrome instalado:

```bash
npm test
```

O teste valida personalização, edição, produtos, arquivos, filtros, detalhes, orçamento, mensagem do WhatsApp e largura mobile.
