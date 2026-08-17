# Mimos Helo Personalizados

Catálogo estático e responsivo da Mimos Helo, com personalização dos produtos, seleção de itens e envio do orçamento pelo WhatsApp.

## Abrir localmente

Na pasta do projeto, execute:

```bash
python3 -m http.server 4173
```

Depois, acesse `http://localhost:4173`.

## Atualizar o catálogo

- Produtos, preços, opções, campos de personalização e descrições ficam no início de `script.js`, dentro da lista `products`.
- O número do WhatsApp fica na constante `WHATSAPP_NUMBER`, também em `script.js`.
- Imagens ficam em `assets/images`.
- Catálogos para abrir ou baixar ficam em `assets/catalogs`.

Os dados preenchidos na personalização ficam somente na sessão atual do navegador e são utilizados para montar a mensagem enviada ao WhatsApp.

## Publicar

O projeto não depende de framework ou banco de dados. Basta publicar toda esta pasta em uma hospedagem estática, como Netlify, Vercel, Cloudflare Pages ou a hospedagem contratada junto com o domínio.

## Verificação

Com o servidor local ativo e o Google Chrome instalado:

```bash
node tests/smoke.mjs
```

O teste valida personalização, edição, produtos, arquivos, filtros, detalhes, orçamento, mensagem do WhatsApp e largura mobile.
