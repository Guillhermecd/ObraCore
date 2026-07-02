# BIMD Template

Template oficial para novos sistemas da BIMD Software Solutions.

Este repositório é um monorepo com frontend React/Vite e backend Node.js/Sails.js. Ele funciona de forma independente em desenvolvimento local e foi organizado para ser integrado futuramente ao repositório `infra` da BIMD sem mudanças estruturais.

## Estrutura

```text
bimd-template/
  backend/
  frontend/
  docker-compose.dev.yml
  ARCHITECTURE.md
  README.md
```

O fluxo principal de desenvolvimento é:

```sh
cd backend
npm run dev
```

```sh
cd frontend
npm run dev
```

O arquivo `docker-compose.dev.yml` é apenas uma conveniência para subir MongoDB, MinIO e Mailpit localmente. O template não depende dele para executar.

## Serviços locais

O backend assume que estes serviços existem em desenvolvimento:

- MongoDB em `mongodb://localhost:27017`
- MinIO em `http://localhost:9000`
- Mailpit SMTP em `127.0.0.1:1025`

Para subir os serviços com Docker:

```sh
docker compose -f docker-compose.dev.yml up -d
```

Interfaces úteis:

- MinIO Console: `http://localhost:9001`
- Mailpit UI: `http://localhost:8025`

MongoDB e MinIO são obrigatórios no boot do backend. Se algum estiver indisponível, o Sails não inicia e exibe erro específico. Mailpit é validado no boot, mas falha apenas gera warning porque e-mail pode estar desabilitado ou apontando para outro SMTP.

## Backend

Tecnologias:

- Node.js
- Sails.js
- MongoDB com `sails-mongo`
- JWT
- bcrypt
- Dayjs
- Nodemailer
- AWS SDK v3 compatível com S3/MinIO

Setup:

```sh
cd backend
cp .env.example .env
npm install
npm run dev
```

Scripts:

- `npm run dev`: inicia Sails com nodemon.
- `npm start`: inicia em modo produção.
- `npm run lint`: executa ESLint.
- `npm run format`: aplica Prettier.
- `npm run format:check`: valida Prettier.

### Variáveis principais

```env
PORT=1337
MONGO_URL=mongodb://localhost:27017/bimd_template
JWT_SECRET=change-me
FRONTEND_BASE_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173

INITIAL_USER_EMAIL=admin@bimd.local
INITIAL_USER_PASSWORD=ChangeMe123!
INITIAL_USER_NAME=Administrador

EMAIL_ENABLED=true
EMAIL_FROM=no-reply@bimd.local
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
SMTP_SECURE=false

S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_BUCKET=bimd-template
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_FORCE_PATH_STYLE=true
S3_PRESIGNED_URL_EXPIRES_IN=900
```

## Autenticação

A autenticação é stateless com JWT.

Rotas públicas:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/verify-email`
- `POST /api/auth/resend-verification`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

Rotas privadas:

- `GET /api/profile`
- `PATCH /api/profile`
- `PATCH /api/profile/email`
- `PATCH /api/profile/password`
- `POST /api/profile/image`
- `GET /api/storage/presigned-url`

Logout não existe no backend. O frontend remove dados locais com:

```js
localStorage.clear();
```

Depois redireciona para a tela de login.

## Datas

Padrão obrigatório: toda data trafegada entre frontend e backend deve ser ISO String.

Exemplo:

```text
2026-06-21T18:00:00.000Z
```

Não usar timestamps numéricos, datas serializadas automaticamente sem controle, nem formatos locais. O template usa Dayjs para manipulação de datas, e os models Sails armazenam `createdAt` e `updatedAt` como ISO String.

## Cadastro e validação de e-mail

O cadastro é feito no modal `CreateAccountModal` dentro da `LoginPage`.

Campos:

- E-mail
- Confirmação de e-mail
- Senha
- Confirmação de senha
- Nome opcional

Após o cadastro, o backend cria o usuário, gera token de validação e envia e-mail. Em desenvolvimento, o e-mail aparece no Mailpit.

## Recuperação de senha

O modal `ForgotPasswordModal` solicita o e-mail e sempre mostra resposta genérica:

```json
{
  "message": "Se o e-mail informado existir, enviaremos um link para redefinição de senha."
}
```

O backend nunca revela se o e-mail existe. A página pública `/reset-password/:token` recebe nova senha e confirmação.

## Uploads

Uploads usam integração S3 compatível com MinIO. A foto de perfil é o exemplo inicial, mas os serviços de storage foram criados para reutilização em novos módulos.

Operações base:

- Upload
- Download
- URL pré-assinada

## Frontend

Tecnologias:

- React
- TypeScript
- Vite
- Ant Design
- React Router DOM
- React Hook Form
- Dayjs

Setup:

```sh
cd frontend
npm install
npm run dev
```

Scripts:

- `npm run dev`: inicia Vite.
- `npm run build`: executa TypeScript e build.
- `npm run lint`: executa ESLint.
- `npm run format`: aplica Prettier.
- `npm run format:check`: valida Prettier.

Convenções:

- Rotas ficam em `src/router.tsx`.
- Cada página fica em pasta própria dentro de `src/pages`.
- Componentes usados por uma única página ficam dentro da pasta da página.
- Componentes compartilhados ficam em `src/components`.
- Todos os formulários usam React Hook Form com `Controller`.
- Chamadas ao backend ficam sempre em serviços dentro de `src/api/modules`.
- Páginas e componentes não devem chamar `fetch`, `axios`, URLs do backend ou `api(...)` diretamente.
- O cliente HTTP central fica em `src/api/modules/api.ts` e exporta `api` e `authStorage`.
- Tipos compartilhados entre módulos ficam em `src/api/modules/types.ts`.
- Tipos usados por apenas um serviço ficam no arquivo do próprio serviço.
- Cada serviço importa somente o `api` central de `./api` e concentra as URLs do seu domínio.
- A UI deve usar Ant Design como base. Não criar arquivos `.css` no template.
- Estilos pontuais ficam inline com `style`/`styles` nos componentes.
- Tokens, cores, fonte e padrões globais ficam em `src/theme.ts` e são aplicados pelo `ConfigProvider`.
- O tema inicial usa as cores BIMD: `#000000`, `#0050FF`, `#FFFFFF` e `#06BFFF`.
- A tipografia usa o padrão do Ant Design. Só configure fonte própria no tema se o projeto incluir e carregar o asset da fonte.

Exemplo de serviço:

```ts
import { api } from './api';
import type { User } from './types';

type AuthResponse = {
  token: string;
  user: User;
};

export const AuthService = {
  login(payload: { email: string; password: string }) {
    return api<AuthResponse>('/auth/login', {
      method: 'POST',
      auth: false,
      body: JSON.stringify(payload),
    });
  },
};
```

## Integração com infra

O template respeita os contratos do repositório `infra`:

- `frontend/` e `backend/` na raiz do projeto.
- Backend escutando em `PORT=1337`.
- Frontend buildado para `frontend/dist`.
- Nginx de produção servindo o frontend e encaminhando `/api/` para o backend.
- MongoDB via `MONGO_URL`.
- Storage via `S3_*` e `STORAGE_*`.
- SMTP via `SMTP_*` e `EMAIL_*`.
- CORS via `CORS_ORIGIN` ou `CORS_ORIGINS`.

Para integrar no futuro, clone ou copie a pasta `infra/` ao lado de `frontend/` e `backend/`, configure `infra/.env` e execute `infra/deploy.sh`.

## Validações esperadas

```sh
cd backend
npm run lint
```

```sh
cd frontend
npm run lint
npm run build
```

Não há E2E, testes visuais, Playwright, Cypress ou snapshots neste template.
