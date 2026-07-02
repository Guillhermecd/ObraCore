# Frontend BIMD Template

Frontend React + TypeScript + Vite do template oficial BIMD.

```sh
npm install
npm run dev
```

Scripts:

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run format`
- `npm run format:check`

Rotas e páginas ficam em `src/router.tsx` e `src/pages`.

## UI e tema

- Use Ant Design como base para telas, formulários e componentes.
- Não crie nem importe arquivos `.css` neste template.
- Use `style`/`styles` inline para ajustes pontuais de layout.
- Configure cores, tipografia e padrões globais em `src/theme.ts`.
- O tema é aplicado em `src/main.tsx` pelo `ConfigProvider` do Ant Design.
- O tema inicial usa as cores BIMD: `#000000`, `#0050FF`, `#FFFFFF` e `#06BFFF`.
- A tipografia usa o padrão do Ant Design. Só configure fonte própria no tema se o projeto incluir e carregar o asset da fonte.

Consulte o `README.md` da raiz para a documentação completa do template.
