# Mimos Helo Personalizados

Catálogo responsivo da Mimos Helo, com gestão de produtos, personalização dos itens, seleção e envio do orçamento pelo WhatsApp.

## Catálogo automático

O catálogo público funciona com uma lista local de segurança e usa Cloudflare D1 e R2 quando conectado. A proprietária administra produtos, fotos, preços, opções e campos de personalização em `admin.html`, sem editar código. O acesso administrativo usa credenciais protegidas por hash e uma sessão em cookie seguro.

O banco armazena somente informações dos produtos. Os dados preenchidos pelos compradores permanecem na sessão do navegador e são usados para montar a mensagem do WhatsApp.

Veja o passo a passo em [`CONFIGURAR-CATALOGO.md`](CONFIGURAR-CATALOGO.md).

## Abrir localmente

Na pasta do projeto, execute:

```bash
python3 -m http.server 4173
```

Depois, acesse `http://localhost:4173`.

## Atualizar o catálogo

- Antes da conexão com o D1, os produtos de segurança ficam no início de `script.js`, dentro da lista `products`.
- Depois da configuração, cadastre e altere os produtos pela área administrativa em `/admin`.
- O número do WhatsApp fica na constante `WHATSAPP_NUMBER`, também em `script.js`.
- Imagens ficam em `assets/images`.
- Catálogos para abrir ou baixar ficam em `assets/catalogs`.

Os dados preenchidos na personalização ficam somente na sessão atual do navegador e são utilizados para montar a mensagem enviada ao WhatsApp.

## Publicar

O frontend não depende de framework. Na Cloudflare Pages, a pasta `functions` fornece a API, o D1 guarda o catálogo e o R2 guarda as fotos. A senha administrativa não é salva no código nem enviada pelo banco: somente seu hash fica nos secrets do Pages.

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
