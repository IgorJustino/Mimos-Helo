# Banco de dados

O Cloudflare D1 guarda três conjuntos de dados:

- `products`: catálogo, opções e campos de personalização;
- `admin_credentials`: credencial administrativa protegida por hash;
- `admin_login_attempts`: limite temporário de tentativas de login.

`migrations/` contém apenas estrutura de produção. Para criar uma mudança, adicione uma nova migração numerada; não edite uma migração já aplicada.

`fixtures/demo-products.sql` contém produtos opcionais para testes locais. O arquivo nunca deve ser executado no banco de produção.

```bash
npm run db:migrate:local
npm run db:seed:local
```
