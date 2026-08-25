# Configurar o catálogo na Cloudflare

O projeto usa serviços da Cloudflare que possuem faixa gratuita:

- **Pages + Functions**: hospeda o site e a API;
- **D1**: guarda produtos, preços e opções;
- **R2**: guarda as fotos enviadas pelo painel;
- **D1 privado**: guarda credenciais administrativas e contagens anônimas do funil.

Se o D1 estiver vazio, o catálogo mostra uma mensagem orientando o cliente a falar pelo WhatsApp. Dados preenchidos pelos compradores permanecem no navegador e seguem somente na mensagem do WhatsApp.

## 1. Entrar na Cloudflare pelo terminal

Na pasta do projeto, execute:

```bash
npx wrangler login
```

O navegador abrirá a Cloudflare. Crie uma conta ou entre e autorize o Wrangler.

## 2. Criar o banco D1

Execute:

```bash
npx wrangler d1 create mimos-helo-catalogo
npx wrangler d1 migrations apply mimos-helo-catalogo --remote
```

Confirme a aplicação quando o terminal perguntar. As migrações criam as tabelas necessárias e preparam o catálogo. Depois, use o painel administrativo para cadastrar os produtos que devem aparecer no site.

## 3. Criar o espaço de fotos R2

Execute:

```bash
npx wrangler r2 bucket create mimos-helo-imagens
npx wrangler r2 bucket lifecycle add mimos-helo-imagens delete-pending-uploads pending/ --expire-days 1
```

O bucket é privado. As imagens são entregues ao catálogo somente pela rota `/media`, que aplica cache e não expõe credenciais.

A regra `delete-pending-uploads` apaga depois de um dia somente uploads temporários que não chegaram a ser vinculados a um produto. O prefixo permanente `catalogo/` não é afetado. Para conferir:

```bash
npx wrangler r2 bucket lifecycle list mimos-helo-imagens
```

## 4. Publicar no Cloudflare Pages

O projeto `mimos-helo` foi criado como **Direct Upload**. Para publicar uma alteração de código depois do commit, execute na pasta do projeto:

```bash
npm run deploy
```

A pasta `public` contém o site e `functions` é reconhecida automaticamente como a API. Alterações feitas pela proprietária no painel não precisam de commit nem deploy: são gravadas no D1 e aparecem no catálogo imediatamente.

## 5. Conectar D1 e R2 ao Pages

Os bindings também estão declarados em `wrangler.jsonc`. Para conferi-los no painel, abra o projeto `mimos-helo` em **Settings > Bindings**:

| Tipo | Nome da variável | Recurso |
|---|---|---|
| D1 database | `DB` | `mimos-helo-catalogo` |
| R2 bucket | `IMAGES` | `mimos-helo-imagens` |

Se precisar cadastrá-los manualmente, use exatamente os nomes da tabela. Depois faça um novo deploy.

Abra `/api/health`. Quando estiver correto, a resposta conterá `"configured":true`.

## 6. Configurar o domínio

Para um domínio `.com.br`, compre no <https://registro.br>. Depois:

1. Adicione o domínio à conta Cloudflare em **Websites > Add a domain**.
2. No Registro.br, troque os servidores DNS pelos dois nameservers mostrados pela Cloudflare.
3. Aguarde a ativação do domínio.
4. No Pages, abra **Custom domains** e conecte o domínio principal, por exemplo `mimoshelo.com.br`.
5. Conecte também `admin.mimoshelo.com.br` ao mesmo projeto Pages.

O domínio principal fica público. O subdomínio `admin` será protegido na próxima etapa.

## 7. Credenciais do painel

As credenciais ficam na tabela privada `admin_credentials` do D1. Ela não possui rota pública e somente as Functions conseguem consultá-la:

| Campo | Finalidade |
|---|---|
| `username` | nome usado no formulário de login |
| `password_hash` | hash PBKDF2 da senha; a senha original não fica armazenada |
| `session_secret` | assina o cookie seguro da sessão |

Para trocar a senha, gere um novo hash e atualize essa linha pela ferramenta D1. Nunca coloque a senha original, o hash ou a chave de sessão no Git.

O login possui limite de tentativas por endereço IP. A sessão dura oito horas, usa cookie `HttpOnly`, `Secure` e `SameSite=Strict`.

## 8. Acompanhar o caminho até o WhatsApp

Depois do login, o painel mostra as visitas, aberturas de produtos, adições à seleção e cliques no WhatsApp dos últimos 30 dias. A taxa de conversão é calculada como cliques no WhatsApp divididos por visitas ao catálogo.

As métricas não armazenam nome, telefone, personalizações ou o texto do pedido. Elas começam em zero e passam a contar somente depois da publicação desta versão.

## Solução de problemas

- **“Configuração necessária”**: confira os bindings `DB` e `IMAGES`, aplique as migrações e faça novo deploy.
- **O catálogo não abre**: acesse `/api/health`; o campo `configured` precisa estar como `true` para o site consultar o D1.
- **Usuário ou senha incorretos**: confira as credenciais e respeite letras maiúsculas e minúsculas.
- **Muitas tentativas**: aguarde 15 minutos antes de tentar novamente.
- **Imagem não envia**: use JPG, PNG ou WebP com até 5 MB e confira o binding `IMAGES`.
- **Produto não aparece**: ative **Produto publicado** no painel e salve.
