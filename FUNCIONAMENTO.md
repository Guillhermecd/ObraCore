# Como o software funciona

Este documento explica o **funcionamento do produto** (domínio, fluxos, regras de negócio). Para instruções de setup/execução veja [README.md](./README.md); para as convenções de integração com a infraestrutura veja [ARCHITECTURE.md](./ARCHITECTURE.md).

## Visão geral

O sistema é um **controle de gastos de obra**: o usuário cadastra lançamentos (gastos), organiza-os por categoria/fonte, acompanha um resumo visual no Dashboard e pode colaborar com outras pessoas no mesmo conjunto de gastos através de **grupos**.

## Autenticação

- Login stateless via **JWT** (`POST /api/auth/login`), token guardado no `localStorage` do navegador e enviado em `Authorization: Bearer <token>` em toda chamada autenticada.
- Cadastro (`POST /api/auth/register`) exige confirmação de e-mail e de senha, envia e-mail de verificação (em dev, visível no Mailpit).
- Recuperação de senha por e-mail (`forgot-password` / `reset-password`), sempre com resposta genérica para não revelar se o e-mail existe.
- Não há "logout" no backend (JWT é stateless); o frontend apenas limpa o `localStorage` e redireciona para o login.

## Grupos (colaboração multi-usuário)

Um **grupo** é o espaço de trabalho compartilhado — na prática, uma obra (ou qualquer conjunto de gastos) que pode ter vários colaboradores. Todas as entidades de negócio (lançamentos, categorias, fontes) pertencem a um `groupId`.

- **Grupo Pessoal**: todo usuário tem um grupo `isPersonal: true` criado automaticamente (sob demanda, na primeira vez que é necessário) para uso individual, sem precisar convidar ninguém.
- **Grupo ativo**: o frontend guarda o `activeGroupId` no `localStorage` e o envia no header `X-Group-Id` em toda requisição. O backend (`GroupService.resolveGroupId`) valida se o usuário é membro daquele grupo; caso contrário, cai de volta para o grupo Pessoal. Isso é o que faz o "escopo por grupo" funcionar em todos os controllers de lançamentos/categorias/fontes.
- **Troca de grupo**: um seletor no topo do layout (`GroupSelect`, dentro do `PrivateLayout`) lista os grupos do usuário e troca o grupo ativo.
- **Convites**: só o **dono (owner)** de um grupo pode convidar outro usuário já cadastrado, por e-mail. O convite fica `pending` até o convidado aceitar/recusar (ou o convite ser cancelado por quem convidou). Ao aceitar, o usuário vira membro do grupo.
- **Gestão do grupo**: o dono pode editar nome/descrição/gasto planejado (com histórico de quem alterou e quando), remover colaboradores e excluir o grupo — exceto o grupo Pessoal, que não pode ser excluído nem editado nesse sentido.
- Tela dedicada: **Grupos** (`/grupos`), com "Meus grupos", convites enviados e convites recebidos.

## Lançamentos (Controle)

Tela **Controle** — cadastro e histórico dos gastos:

- Cada lançamento tem: data, categoria, fonte, fornecedor (opcional), forma de pagamento, valor, observações e, opcionalmente, um **comprovante** anexado.
- **Categorias** e **fontes** são criadas sob demanda (botão "+" dentro do próprio formulário de lançamento) e pertencem ao grupo ativo.
- **Comprovante**: no modal de novo/editar lançamento é possível anexar um PDF ou imagem (JPG/PNG). O arquivo é enviado ao **MinIO** (armazenamento compatível com S3) num segundo passo, depois que o lançamento é salvo; o backend guarda a referência (`bucket`, `key`, `contentType`, `url`) no próprio lançamento. A URL de download é **presignada** e expira em alguns minutos, por isso é regenerada a cada listagem — o comprovante pode ser visto/baixado no modal de detalhes do lançamento.
- **Importação em massa**: upload de planilha `.csv`/`.xlsx` com preview (mostra o que é válido/inválido antes de confirmar) e criação automática de categorias/fontes citadas na planilha que ainda não existem.
- **Exportação em Excel**: botão "Exportar planilha" gera um `.xlsx` real (gerado no backend com `exceljs`) com todos os lançamentos do grupo ativo, nas mesmas colunas do modelo de importação — ou seja, o arquivo exportado pode ser reimportado depois.
- Exclusão individual ou em massa (seleção múltipla na tabela).

## Dashboard

Resumo visual dos gastos do grupo ativo, com filtro por período (data inicial/final) e visual
glassmorphism (cards translúcidos sobre fundo em gradiente, adaptado a tema claro/escuro):

- KPIs do período filtrado: total gasto (com o gasto planejado do grupo como subtexto), progresso
  (% do planejado já gasto, com barra) e número de lançamentos.
- Gráfico de barra: gasto por categoria. Gráfico de coluna: evolução mensal do gasto.
- Cards **Por Fonte** e **Por Pagamento**: listas com barra de proporção por fonte/forma de
  pagamento. Card **Status**: categorias usadas no período e receita livre (gasto planejado menos
  o total já gasto no projeto inteiro, sem o filtro de período — verde quando positiva).
- Tabela de top fornecedores.
- **Exportar PDF**: captura o dashboard exatamente como está na tela (respeitando o tema claro/escuro ativo) e gera um PDF paginado para download — útil para compartilhar o resumo sem dar acesso ao sistema.

## Tema claro/escuro

Preferência puramente do navegador (guardada em `localStorage`, chave `theme-mode`), alternada por um botão (sol/lua) no cabeçalho do layout. Não há preferência de tema por usuário no servidor.

## Papéis e permissões, em resumo

- Qualquer membro de um grupo pode ver e lançar gastos, categorias e fontes daquele grupo.
- Só o **dono** de um grupo pode: editar dados do grupo, convidar/remover colaboradores e excluir o grupo.
- O grupo Pessoal de cada usuário é intocável (não pode ser excluído).
