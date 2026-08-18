# Configurar o catálogo automático

O site continua funcionando com os produtos locais enquanto o Supabase não estiver configurado. Depois desta configuração, os produtos passam a ser carregados do banco e podem ser alterados em `/admin`.

## 1. Criar o projeto no Supabase

1. Acesse <https://supabase.com/dashboard> e crie uma conta.
2. Clique em **New project**.
3. Escolha um nome, uma senha forte para o banco e a região mais próxima disponível.
4. Aguarde o projeto ficar pronto.

## 2. Criar as tabelas e os produtos iniciais

1. No menu do projeto, abra **SQL Editor**.
2. Clique em **New query**.
3. Abra o arquivo [`supabase/setup.sql`](supabase/setup.sql) deste repositório.
4. Copie todo o conteúdo, cole no editor e clique em **Run**.

Esse script cria:

- tabela de produtos;
- lista de administradores;
- seis produtos iniciais;
- espaço de armazenamento de imagens;
- regras que permitem leitura pública e escrita somente por administradores.

## 3. Criar o acesso da proprietária

1. No Supabase, abra **Authentication > Users**.
2. Clique em **Add user** e escolha a opção para criar um usuário.
3. Informe o e-mail da proprietária e uma senha temporária forte.
4. Confirme a criação do usuário.
5. Volte ao **SQL Editor** e execute, trocando o e-mail:

```sql
insert into public.admin_users (user_id)
select id
from auth.users
where lower(email) = lower('EMAIL_DA_CLIENTE')
on conflict (user_id) do nothing;
```

6. Em **Authentication**, desative novos cadastros públicos. O painel não possui botão de cadastro; somente usuários criados por você devem entrar.

## 4. Copiar as credenciais públicas

No Supabase, abra as configurações de API do projeto e copie:

- **Project URL**;
- **Publishable key**. Projetos antigos podem mostrar o nome **anon key**.

Não copie `Secret key` nem `service_role`. Essas chaves nunca podem aparecer no site.

## 5. Configurar a Vercel

1. Abra o projeto `mimos-helo` na Vercel.
2. Entre em **Settings > Environment Variables**.
3. Crie a variável `SUPABASE_URL` com o valor de **Project URL**.
4. Crie a variável `SUPABASE_PUBLISHABLE_KEY` com o valor da **Publishable key**.
5. Marque os ambientes **Production**, **Preview** e **Development**.
6. Salve as variáveis.
7. Abra **Deployments**, localize o último deploy e escolha **Redeploy**.

As variáveis só entram em vigor em um novo deploy.

## 6. Abrir o painel

Depois do novo deploy, acesse:

```text
https://mimos-helo.vercel.app/admin
```

Entre com o e-mail e a senha criados no Supabase. A proprietária poderá:

- cadastrar, editar e excluir produtos;
- publicar ou ocultar produtos;
- enviar fotos;
- alterar preço, descrição e categoria;
- criar opções com preços diferentes;
- criar campos de personalização;
- organizar a ordem do catálogo.

Cada produto salvo aparece automaticamente no catálogo público. Os dados preenchidos pelos compradores continuam somente no navegador e seguem diretamente para o WhatsApp.

## Solução de problemas

- **Aparece “Configuração necessária”**: confira as duas variáveis da Vercel e faça um novo deploy.
- **Login incorreto**: confirme o usuário em Authentication > Users.
- **Usuário sem autorização**: execute novamente o comando da etapa 3 com o e-mail correto.
- **Imagem não envia**: confirme que o arquivo é JPG, PNG ou WebP e possui até 5 MB.
- **O produto está no painel, mas não aparece no site**: ative a opção **Produto publicado** e salve.
