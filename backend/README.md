# Backend BIMD Template

Backend Sails.js do template oficial BIMD.

```sh
cp .env.example .env
npm install
npm run dev
```

Serviços obrigatórios em desenvolvimento:

- MongoDB em `MONGO_URL`
- MinIO/S3 em `S3_ENDPOINT`

Mailpit/SMTP é validado no boot, mas falha apenas gera warning.

Scripts:

- `npm run dev`
- `npm start`
- `npm run lint`
- `npm run format`
- `npm run format:check`

Consulte o `README.md` da raiz para a documentação completa do template.
