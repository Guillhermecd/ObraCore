# Handoff: Dashboard Consolidado — Financeiro (redesenho)

## Overview
Redesenho da tela principal (dashboard consolidado financeiro) de um app de gestão de obras. O objetivo é dar hierarquia à leitura para o **dono/gestor**, respondendo em um relance às duas perguntas centrais: **"Estou lucrando? quanto?"** e **"Alguma obra está em risco?"**. Substitui o antigo empilhamento de ~16 cards iguais por: resumo-herói no topo, gráfico de tendência, bloco de caixa e detalhamento em 3 cards. O filtro de período (Mês/Trimestre/Ano) governa resultado, realizado e a tendência.

## About the Design Files
O arquivo `Dashboard Consolidado.dc.html` deste pacote é uma **referência de design feita em HTML** — um protótipo que mostra o visual e o comportamento pretendidos, **não** código de produção para copiar. A tarefa é **recriar esse layout no ambiente já existente do projeto** (React/Vue/etc.), usando os componentes, tokens e padrões que o app já tem. Não é para embutir o HTML direto.

> Observação técnica: o `.dc.html` é um "Design Component". Para ler apenas o layout, abra no navegador OU ignore o wrapper e leia o markup entre `<x-dc>...</x-dc>` (estrutura) e a classe `Component` no `<script>` (dados/lógica do gráfico e do filtro).

## Fidelity
**High-fidelity (hifi).** Cores, tipografia, espaçamentos e estados finais. Recriar fiel usando as libs do codebase.

## Screens / Views

### Consolidado — Financeiro (tela única, scroll vertical)
Layout: `flex` horizontal — sidebar fixa `230px` + `main` com scroll. Conteúdo do main em coluna, `gap:22px`, `max-width:1400px`, padding `26px 34px 60px`. Header é `sticky top:0` com blur.

**1. Sidebar (230px, bg `#0b0a09`, borda direita `#201c19`)**
- Topo: logo centralizado — colchetes `‹ ›` cinza (`#5a524a`) ladeando um ícone `40×40` radius `11px` com gradiente `linear-gradient(150deg,#ff7a1a,#c94e10)`. **NÃO alterar este bloco** (mantido igual ao app atual).
- Dois botões de ação `34×34` (tema claro / visibilidade), bg `#17140f`, borda `#2a2520`.
- Nav: Consolidado (ativo), Obra, Controle, Grupos, Perfil. Item ativo: bg `#ff7a1a`, texto `#100e0c`, weight 600. Inativos: texto `#a89e93`, hover bg `#17140f`.
- Rodapé: "Sair" em vermelho `#c56b5c`.

**2. Header**
- Título "Consolidado — Financeiro" 24px/700. Subtítulo 13px `#8a8178` com o período em destaque.
- À direita: segmented control (Mês/Trimestre/Ano) — pílula bg `#0b0a09` borda `#201c19`, botão ativo bg `#ff7a1a` texto `#100e0c`; abaixo, range de datas em mono `#8a8178`.

**3. Herói — grid `1.55fr / 1fr`, gap 22px**
- **Card esquerdo "Lucro reconhecido {período}"** (bg `#17140f`, borda `#2a2520`, radius 16, padding 26/28): label uppercase + badge verde de margem; número grande `IBM Plex Mono` 46px/600 cor `#54c88a`; delta comparativo; linha "sobre {receita} de receita reconhecida". Rodapé dividido em 2: Projetado (em andamento) e Realizado (concluídas), cada um com valor 20px verde + sublegenda.
- **Card direito "Obras em risco"** (central de alertas): header com ícone âmbar + badge circular com a contagem (2). Lista de alertas compactos: cada linha com bolinha de severidade (vermelho `#e5544b` com `animation:pulseDot 2s infinite` para crítico; âmbar `#e0a020` para atenção), título 13px/600, descrição 12px `#a89e93`, botão "Ver". Link "Ver todas as obras →".

**4. Tendência — 12 meses** (card full width; ocultável via flag `showTrend`)
- Header com legenda (verde = Lucro reconhecido acumulado; laranja = Caixa livre).
- Gráfico SVG de linhas (viewBox `0 0 760 240`): 2 séries + área com gradiente verde sob a linha de lucro, gridlines horizontais em 0/10k/20k/30k, labels de meses (alternados), banda de destaque laranja translúcida sobre o intervalo do período selecionado, ponto final destacado com rótulo de valor.

**5. Posição de caixa** (card full width) — marcado como *snapshot / não filtrado*.
- Grid de 4 colunas separadas por borda esquerda: Saldo total (verde), Comprometido (branco), Caixa livre (verde), Aporte a fazer (laranja `#ff9647`). Valores em `IBM Plex Mono` 26px/600.
- Sub-bloco "Cobertura de caixa": barra `9px` radius 6, preenchimento `67%` com gradiente `linear-gradient(90deg,#e0a020,#e5544b)`, marcador de meta verde em 100%, valor 67% em vermelho, texto explicativo.

**6. Detalhamento — grid de 3 cards iguais**
Cada card (bg `#17140f`, borda `#2a2520`, radius 16): ícone + título, sublabel uppercase, grid 2×2 de mini-stats (label 12px `#8a8178` + valor `IBM Plex Mono` 18px/600; lucro em verde com margem).
- **Lucro projetado — em andamento:** Obras 3 · Valor esperado R$ 505.000 · Custo projetado R$ 485.000 · Lucro R$ 20.000 (margem 4%). *(snapshot, não filtrado)*
- **Resultado — reconhecido {período}:** Contratos · Receita · Custo · Lucro (margem). *(filtrado)*
- **Lucro realizado — concluídas {período}:** Obras · Valor de fechamento · Custo realizado · Lucro (margem). *(filtrado)*

## Interactions & Behavior
- Segmented control Mês/Trimestre/Ano altera o estado `period`, que recalcula: card-herói (lucro, margem, receita, delta), Resultado, Lucro realizado, range de datas no header, e a banda de destaque + dataset do gráfico.
- Caixa e Lucro projetado são **snapshot** — não reagem ao filtro (rotular claramente).
- Botões "Ver" nos alertas → navegar para a obra correspondente. "Ver todas as obras →" → lista de obras.
- Bolinha de severidade crítica pulsa (opacity 1↔0.35, 2s).
- Hover: itens de nav, botões de alerta e links mudam de fundo/cor.

## State Management
- `period: 'mes' | 'tri' | 'ano'` (default `'ano'`). Deriva todos os valores filtrados.
- `showTrend: boolean` (mostra/oculta o gráfico).
- Dados por período (substituir por fetch real da API): ver objeto `periods` no protótipo — chaves `receita, custo, lucro, margem, contratos, delta, range` e `rzObras/rzValor/rzCusto/rzLucro/rzMargem`.
- Séries do gráfico: arrays `lucro[12]` e `caixa[12]` (valores em milhares) + `months[12]`.

## Design Tokens
**Cores**
- Fundo página `#100e0c`; sidebar `#0b0a09`; card `#17140f`; card interno/escuro `#120f0c`.
- Bordas: `#201c19`, `#2a2520`, `#241f1b`.
- Texto: primário `#f3efe9`, forte `#e8e2da`, secundário `#c9bfb4`, muted `#8a8178`, sutil `#6f665d` / `#7c736a`.
- Accent laranja `#ff7a1a` (hover `#ff9647`), gradiente logo `#ff7a1a→#c94e10`.
- Positivo/dinheiro `#54c88a`; atenção `#e0a020`; crítico `#e5544b` (texto claro `#e5847a`).
- Aporte `#ff9647`; Sair `#c56b5c`/`#e5544b`.

**Tipografia**
- UI: `IBM Plex Sans` (400/500/600/700).
- Números/valores/datas: `IBM Plex Mono` (500/600) — usar tabular para alinhar valores.

**Raio / espaçamento**
- Radius: cards 16px, sub-cards 11–12px, botões/pílulas 8–10px, badges 20px.
- Gaps principais: 22px entre seções; grids internos 18–20px.

**Sombra:** nenhuma — separação por bordas de 1px e contraste de fundo.

## Assets
- Ícones: **Material Symbols Rounded** (Google Fonts) via ligadura — `dashboard, apartment, tune, groups, person, logout, light_mode, visibility, construction, notifications_active, account_balance_wallet, trending_up, receipt_long, task_alt, calendar_today`. Trocar pela biblioteca de ícones do codebase se houver.
- Fontes: Google Fonts (`IBM Plex Sans`, `IBM Plex Mono`).
- Gráfico: SVG desenhado por código (sem imagem). Recriar com a lib de charts do projeto (Recharts/Chart.js/etc.) ou SVG próprio.
- Nenhuma imagem raster.

## Files
- `Dashboard Consolidado.dc.html` — protótipo hifi completo (layout no markup `<x-dc>`, dados e gráfico na classe `Component`).
