# Dicionário de métricas

Fonte única do significado de cada número das telas **Consolidado** e **Obra**.
Referenciado pelos comentários em `backend/api/services/DashboardService.js`,
`backend/api/controllers/dashboard/obra.js`, `frontend/src/api/modules/types.ts`
e `backend/test/dashboard-service.test.js`.

Todo cálculo financeiro vive no backend, em `DashboardService.js`. O front
apenas formata — a única composição que ele faz é o caixa projetado do fluxo
previsto, e está anotada no componente.

## Regras gerais

- **Realizado** é sempre e só o lançamento com `dataRealizada` preenchida.
  Lançamento sem ela é **previsto/pendente** e nunca entra em custo realizado,
  saldo ou aporte.
- **Arredondamento**: 2 casas (`round2`) em todo valor monetário e em todo
  percentual. Convenção única, para o mesmo número (e o mesmo gatilho de risco
  em 80%) não divergir entre endpoints.
- **Ausência de dado é `null`, nunca `0`.** Um `0` na tela é lido como "zero
  reais" ou "margem zero"; `null` é o que faz o componente cair no estado de
  "não informado". Vale para `consumidoPct`, `avanco`, `coberturaPct`,
  `receitaReconhecida`, `lucroReconhecido`, `margemPct`, `folegoMeses`.
- **Escopo temporal** é declarado na tela pelo distintivo de cada bloco
  (`SectionBlock`). Não existe subtítulo explicando o que o filtro governa.

## Tipo de obra

| Tipo | Entrada de dinheiro | Compõe o resultado? |
|---|---|---|
| `CLIENTE` | Recebimento do contrato ("Recebido") | Sim |
| `PROPRIA` | Aporte de capital do dono ("Aportado") | Não |

O rótulo nunca é fixo: vem de `entradaLabel()` / `entradaPendenteLabel()`
(`frontend/src/utils/obra.ts`). `valorContrato` só existe em obra `CLIENTE` —
ao voltar para `PROPRIA` ele é zerado, para não sobrar contrato órfão
alimentando receita de uma obra que deixou de ser de cliente.

## Base por obra (`computeGroupMetrics`) — acumulado, ignora filtro de período

| Campo | Fórmula |
|---|---|
| `custoReal` | Σ `amount` de SAIDA realizada |
| `totalAportado` | Σ `amount` de ENTRADA realizada |
| `saldoAtual` | `totalAportado − custoReal` |
| `gastoPlanejado` | `group.plannedSpending` (0 quando não definido) |
| `consumidoPct` | `custoReal / gastoPlanejado × 100` — `null` sem orçamento |
| `pendencias` | Contagem de SAIDA não realizada |
| `saidasPendentes` | **Valor** Σ das SAIDA não realizadas |
| `orcamentoRestante` | `max(gastoPlanejado − custoReal, 0)` |
| `aporteAFazer` | `max(orcamentoRestante − saldoAtual, 0)`, que se reduz a `max(gastoPlanejado − totalAportado, 0)` — o termo `custoReal` se cancela |
| `coberturaPct` | `saldoAtual / orcamentoRestante × 100` — `null` sem orçamento a executar |

## Ritmo — últimos 3 meses civis completos

O mês corrente fica **fora** de propósito: parcial, ele derrubaria a média todo
dia 1º e faria o fôlego saltar sem nada ter mudado na obra.

| Campo | Fórmula |
|---|---|
| `gastoMedioMensal` | Σ SAIDA realizada nos 3 meses civis anteriores ÷ 3 |
| `folegoMeses` | `saldoAtual / gastoMedioMensal` — `null` sem ritmo ou sem caixa |
| `dataProximoAporte` | hoje + `folegoMeses` × 30 dias |
| `mesEsgotamentoOrcamento` | mês em que `orcamentoRestante` zera no ritmo atual |

Os três últimos são **extrapolação linear** e não consideram cronograma físico.
A tela diz isso ao lado do bloco.

## Contrato — só obra `CLIENTE` com `valorContrato` informado

Reconhecimento **custo sobre custo** (percentage-of-completion):

| Campo | Fórmula |
|---|---|
| `avanco` | `min(custoReal / gastoPlanejado, 1) × 100` — travado em 100% |
| `receitaReconhecida` | `valorContrato × avanco` |
| `lucroReconhecido` | `receitaReconhecida − custoReal` |
| `margemPct` | `lucroReconhecido / receitaReconhecida × 100` |
| `margemPrevistaPct` | `(valorContrato − gastoPlanejado) / valorContrato × 100` — margem na conclusão |

O teto de 100% no avanço existe porque estourar o orçamento não significa ter
entregue mais obra do que o contrato prevê; sem ele a receita reconhecida
passaria do valor do contrato. O prejuízo continua aparecendo, como
`lucroReconhecido` negativo.

**Por que `margemPct` e `margemPrevistaPct` são iguais na obra saudável.** Sob
custo-sobre-custo as duas se reduzem a `(contrato − orçamento) / contrato`
enquanto o custo estiver dentro do orçamento — é o comportamento correto, não
uma duplicação. As duas só divergem quando o custo realizado passa do orçamento
e o avanço trava em 100%: aí a margem realizada cai e a prevista não. **A
divergência entre elas é o sinal de estouro**, e é por isso que ambas aparecem.

## Consolidado

| Campo | Fórmula |
|---|---|
| `saldoTotal` | Σ `saldoAtual` das obras (grupo Pessoal fora) |
| `caixaComprometido` | `Σ max(0, min(orcamentoRestante, saldoAtual))` |
| `caixaLivre` | `saldoTotal − caixaComprometido` |
| `aporteTotalAFazer` | Σ `aporteAFazer` |
| `coberturaCaixaPct` | `saldoTotal / Σ orcamentoRestante × 100` |

O piso em 0 por obra no `caixaComprometido` não é detalhe: sem ele uma obra com
caixa negativo **reduziria** o comprometido e inflaria o caixa livre —
justamente o número que a tela apresenta como o mais honesto.

`coberturaCaixaPct` substituiu o antigo score de "saúde financeira", que
misturava margem e aderência a orçamento num percentual sem fórmula
explicável.

O bloco de **resultado** soma apenas obras `CLIENTE` com contrato: obra própria
não gera receita, e incluí-la inventaria lucro.

## Ordenação e alertas

Obras são ordenadas por **urgência de aporte**: `aporteAFazer` decrescente,
empate resolvido por `folegoMeses` crescente. Nunca por nome ou ordem de
cadastro.

Alerta é **exceção**. O backend não emite mais nível `success`. Regras, em
ordem de prioridade:

1. Caixa não cobre o orçamento restante → `warning`, com `valor` = quanto falta
2. Consumiu ≥ 80% do orçamento e ainda há saídas previstas → `warning`
3. Sem orçamento definido → `info`
4. Caso contrário: nenhum alerta

## Cores

Verde é reservado a saldo positivo e variação favorável; valor neutro fica na
cor de texto padrão. Barras de consumo e de cobertura têm cor por faixa
(`frontend/src/utils/thresholds.ts`):

- **Consumo de orçamento**: neutro < 80%, âmbar 80–100%, vermelho > 100%
- **Cobertura de caixa** (sentido inverso — alto é bom): vermelho < 80%,
  âmbar 80–100%, neutro ≥ 100%
