# Mimos Helo Personalizados

Catálogo responsivo da Mimos Helo, com gestão de produtos, personalização dos itens, seleção e envio do orçamento pelo WhatsApp.

## Catálogo automático

O catálogo público carrega todos os produtos diretamente do Cloudflare D1 e as fotos do R2. A proprietária administra produtos, fotos, preços, opções e campos de personalização em `admin.html`, sem editar código. O acesso administrativo usa credenciais armazenadas em uma tabela privada, senha protegida por hash e uma sessão em cookie seguro.

O banco armazena somente informações dos produtos. Os dados preenchidos pelos compradores permanecem na sessão do navegador e são usados para montar a mensagem do WhatsApp.

Veja o passo a passo em [`CONFIGURAR-CATALOGO.md`](CONFIGURAR-CATALOGO.md).

## Abrir localmente

Na pasta do projeto, execute:

```bash
python3 -m http.server 4173
```

Depois, acesse `http://localhost:4173`.

## Atualizar o catálogo

- Cadastre e altere todos os produtos pela área administrativa em `/admin`.
- O número do WhatsApp fica na constante `WHATSAPP_NUMBER`, também em `script.js`.
- As fotos enviadas pelo painel ficam no Cloudflare R2.

Os dados preenchidos na personalização ficam somente na sessão atual do navegador e são utilizados para montar a mensagem enviada ao WhatsApp.

## Publicar

O frontend não depende de framework. Na Cloudflare Pages, a pasta `functions` fornece a API, o D1 guarda o catálogo e o R2 guarda as fotos. A senha administrativa não é salva no código: somente seu hash fica em uma tabela privada do D1.

Depois de enviar as alterações para a `main`, publique o código com:

```bash
npx wrangler pages deploy . --project-name mimos-helo --branch main
```

Cadastros e edições feitos no painel são gravados diretamente no D1 e não precisam de novo deploy.

## Verificação

Com o servidor local ativo e o Google Chrome instalado:

```bash
node tests/smoke.mjs
node tests/admin-smoke.mjs
```

O teste valida personalização, edição, produtos, arquivos, filtros, detalhes, orçamento, mensagem do WhatsApp e largura mobile.
