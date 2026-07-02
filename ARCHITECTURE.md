# Arquitetura BIMD Template

Este documento registra a análise do repositório `~/Documents/personal-projects/manufy/infra` e as convenções que este template deve respeitar.

## Infra analisada

A infra foi criada para ser clonada dentro de projetos com a estrutura:

```text
projeto/
  frontend/
  backend/
  infra/
```

Ela suporta aplicações fullstack e sites estáticos. Em modo fullstack, sobe MongoDB, backend, frontend/Nginx e, opcionalmente, MinIO. Em modo static, sobe apenas Nginx servindo build estático ou imagem pronta.

Arquivos principais encontrados:

- `docker-compose.yml`: serviços fullstack.
- `docker-compose.build.yml`: build local das imagens a partir de `frontend/` e `backend/`.
- `docker-compose.traefik.yml`: labels e rede externa para Traefik.
- `docker/backend.Dockerfile`: imagem Node do backend.
- `docker/frontend-nginx.Dockerfile`: build Vite e imagem Nginx.
- `nginx/nginx.conf.template`: SPA fallback e proxy `/api/`.
- `init.sh`: geração interativa do `.env`.
- `deploy.sh`: deploy por build local ou imagens.
- `rebuild.sh`: rebuild preservando volumes.
- `logs.sh`: logs do backend.
- `central-traefik/`: proxy central com TLS.

## Convenções da infra

### Descoberta de aplicações

A infra descobre o frontend e backend por variáveis:

- `FRONTEND_DIR=frontend`
- `BACKEND_DIR=backend`

Este template mantém exatamente essas pastas na raiz.

### Containers

Em fullstack, a infra organiza:

- `${PROJECT_NAME}-mongo`
- `${PROJECT_NAME}-minio`
- `${PROJECT_NAME}-backend`
- `${PROJECT_NAME}-nginx`

Os volumes persistentes seguem o mesmo prefixo do projeto:

- `${PROJECT_NAME}-mongo-data`
- `${PROJECT_NAME}-minio-data`

### Docker Compose

O modo principal é controlado por:

- `APP_TYPE=fullstack|static`
- `DEPLOY_MODE=build|image`
- `PUBLIC_MODE=port|traefik`

No modo `build`, as imagens são criadas a partir das pastas `backend/` e `frontend/`. No modo `image`, a infra faz `docker compose pull` das imagens informadas.

### Nginx

O Nginx serve `frontend/dist` e aplica fallback para SPA:

```nginx
try_files $uri $uri/ /index.html;
```

As chamadas `/api/` são encaminhadas para o backend interno:

```nginx
proxy_pass http://backend/api/;
```

Por isso o frontend deve chamar a API usando prefixo `/api` em produção.

### SSL e Traefik

O modo `PUBLIC_MODE=traefik` remove porta publicada diretamente e adiciona labels Traefik no container Nginx. O TLS é resolvido pelo Traefik central usando Let's Encrypt com `TRAEFIK_CERT_RESOLVER=letsencrypt`.

O projeto deve definir:

- `PUBLIC_HOST`
- `PUBLIC_DOMAIN`
- `TRAEFIK_NETWORK`
- `TRAEFIK_ROUTER_NAME`
- `TRAEFIK_SERVICE_NAME`

### Variáveis de ambiente

A infra injeta variáveis no backend e também lê `backend/.env` quando existir.

Contratos relevantes para este template:

- `PORT` e `BACKEND_INTERNAL_PORT`
- `MONGO_URL` e `MONGODB_URI`
- `FRONTEND_BASE_URL`
- `CORS_ORIGIN` e `CORS_ORIGINS`
- `EMAIL_ENABLED`, `EMAIL_FROM`, `SMTP_*`
- `STORAGE_PROVIDER`
- `STORAGE_*`
- `S3_*`

O template aceita tanto `S3_*` quanto `STORAGE_*` para facilitar MinIO local, MinIO da infra ou S3 externo.

### Deploy

O deploy padrão é:

```sh
cd infra
./init.sh
./deploy.sh
```

Para rebuild:

```sh
./rebuild.sh
```

O rebuild preserva volumes de MongoDB e MinIO.

### Logs

Os logs do backend usam driver Docker `json-file` com rotação configurável:

- `BACKEND_LOG_MAX_SIZE`
- `BACKEND_LOG_MAX_FILES`

O script `logs.sh` exibe as últimas linhas do container `${PROJECT_NAME}-backend`.

### MongoDB

Em produção pela infra, MongoDB roda em container e o backend recebe:

```env
MONGO_URL=mongodb://mongo:27017/app
```

Em desenvolvimento local neste template, o padrão é:

```env
MONGO_URL=mongodb://localhost:27017/bimd_template
```

MongoDB é dependência obrigatória do boot.

### MinIO e S3

A infra sobe MinIO quando `STORAGE_PROVIDER=minio` e `COMPOSE_PROFILES=minio`. O entrypoint do backend converte credenciais MinIO para variáveis `S3_*`.

Este template usa AWS SDK v3 compatível com S3/MinIO e aceita:

- `S3_ENDPOINT`
- `S3_REGION`
- `S3_BUCKET`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_FORCE_PATH_STYLE`

MinIO/S3 é obrigatório no boot porque upload de arquivos faz parte do starter kit.

### Mailpit

A infra não sobe Mailpit por projeto; recomenda um Mailpit local reutilizável. Em desenvolvimento, o backend usa:

```env
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
```

Mailpit/SMTP é validado no boot, mas indisponibilidade gera apenas warning.

## Integração futura

Para integrar um projeto criado a partir deste template:

1. Manter `frontend/` e `backend/` na raiz.
2. Adicionar a pasta `infra/` ao lado delas.
3. Configurar `infra/.env` com `APP_TYPE=fullstack`.
4. Manter backend em `PORT=1337`.
5. Garantir que o frontend use `/api` como base em produção.
6. Configurar MongoDB, storage e SMTP pelas variáveis da infra.
7. Executar `infra/deploy.sh`.

Nenhuma decisão local deste template depende da infra. A infra é camada de empacotamento e publicação.
