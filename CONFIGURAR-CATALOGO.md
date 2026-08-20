# Configurar o catálogo na Cloudflare

O projeto usa serviços da Cloudflare que possuem faixa gratuita:

- **Pages + Functions**: hospeda o site e a API;
- **D1**: guarda produtos, preços e opções;
- **R2**: guarda as fotos enviadas pelo painel;
- **Access**: libera o painel somente para o e-mail da proprietária.

O catálogo continua mostrando os seis produtos locais se a conexão com o D1 falhar. Dados preenchidos pelos compradores permanecem no navegador e seguem somente na mensagem do WhatsApp.

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

Confirme a aplicação quando o terminal perguntar. As duas migrações criam a tabela e cadastram os seis produtos iniciais. Elas não apagam produtos existentes e podem ser executadas novamente com segurança pelo comando de migrações.

## 3. Criar o espaço de fotos R2

Execute:

```bash
npx wrangler r2 bucket create mimos-helo-imagens
```

O bucket é privado. As imagens são entregues ao catálogo somente pela rota `/media`, que aplica cache e não expõe credenciais.

## 4. Publicar no Cloudflare Pages

O projeto `mimos-helo` foi criado como **Direct Upload**. Para publicar uma alteração de código depois do commit, execute na pasta do projeto:

```bash
npx wrangler pages deploy . --project-name mimos-helo --branch main
```

A pasta `functions` é reconhecida automaticamente e vira a API do site. Alterações feitas pela proprietária no painel não precisam de commit nem deploy: são gravadas no D1 e aparecem no catálogo imediatamente.

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

## 7. Proteger o painel com Cloudflare Access

1. Abra **Zero Trust** no painel Cloudflare.
2. Em **Settings > Authentication > Login methods**, habilite **One-time PIN**.
3. Entre em **Access > Applications > Add an application > Self-hosted**.
4. Dê o nome `Painel Mimos Helo` e use o domínio `admin.mimoshelo.com.br` sem caminho.
5. Crie uma política **Allow** com a regra **Emails** e informe somente o e-mail da proprietária.
6. Salve e copie o valor **Application Audience (AUD)** exibido pela aplicação.

No Pages, em **Settings > Variables and Secrets**, crie estas variáveis de produção:

| Variável | Valor |
|---|---|
| `TEAM_DOMAIN` | `https://SEU-TIME.cloudflareaccess.com` |
| `POLICY_AUD` | o Audience (AUD) copiado |
| `ADMIN_EMAILS` | o e-mail autorizado; para mais de um, separe por vírgula |

Faça um novo deploy. Ao abrir `https://admin.mimoshelo.com.br/admin`, a Cloudflare enviará um código ao e-mail autorizado. Depois da confirmação, o painel permitirá cadastrar, editar, ocultar e excluir produtos e enviar fotos.

## Solução de problemas

- **“Configuração necessária”**: confira os bindings `DB` e `IMAGES`, aplique as migrações e faça novo deploy.
- **O catálogo mostra os produtos antigos**: acesse `/api/health`; se `configured` não for `true`, a lista local de segurança está sendo usada.
- **Acesso não autorizado**: confirme `TEAM_DOMAIN`, `POLICY_AUD` e `ADMIN_EMAILS`, sem espaços extras.
- **Imagem não envia**: use JPG, PNG ou WebP com até 5 MB e confira o binding `IMAGES`.
- **Produto não aparece**: ative **Produto publicado** no painel e salve.
