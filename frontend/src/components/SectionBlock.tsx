import { Tag, Tooltip, theme } from "antd";
import type { CSSProperties, ReactNode } from "react";

/**
 * Escopo temporal de um bloco. O distintivo é o que substitui os subtítulos
 * explicativos: em vez de um parágrafo dizendo quais números respondem ao
 * filtro, cada bloco declara o próprio escopo ao lado do título.
 */
export type BlockScope = "acumulado" | "periodo" | "ritmo" | "previsto";

const SCOPE_LABEL: Record<BlockScope, string> = {
  acumulado: "Acumulado",
  periodo: "Período selecionado",
  ritmo: "Últimos 3 meses",
  previsto: "Próximos 30 dias",
};

const SCOPE_HINT: Record<BlockScope, string> = {
  acumulado:
    "Números acumulados desde o início da obra. Não mudam ao alterar o filtro de período.",
  periodo: "Responde ao filtro de período do cabeçalho.",
  ritmo:
    "Calculado sobre os 3 meses civis completos anteriores. O mês corrente, ainda parcial, fica de fora.",
  previsto:
    "Lançamentos ainda não realizados com data prevista nos próximos 30 dias.",
};

type SectionBlockProps = {
  title: string;
  scope: BlockScope;
  children: ReactNode;
  /** Nota de rodapé do bloco — ex.: aviso de extrapolação linear. */
  footnote?: ReactNode;
  extra?: ReactNode;
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 12,
};

export function SectionBlock({
  title,
  scope,
  children,
  footnote,
  extra,
}: SectionBlockProps) {
  const { token } = theme.useToken();

  return (
    <section style={{ marginBottom: 28 }}>
      <div style={headerStyle}>
        <h2
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 600,
            color: token.colorTextHeading,
          }}
        >
          {title}
        </h2>
        <Tooltip title={SCOPE_HINT[scope]}>
          {/* Fundo e borda explícitos: a Tag padrão fica sem preenchimento no
              tema claro e o distintivo vira texto solto — justamente o
              elemento que substituiu o subtítulo explicativo de cada bloco. */}
          <Tag
            style={{
              margin: 0,
              cursor: "help",
              fontSize: 12,
              background: token.colorFillSecondary,
              borderColor: token.colorBorder,
              color: token.colorTextSecondary,
            }}
          >
            {SCOPE_LABEL[scope]}
          </Tag>
        </Tooltip>
        {extra && <div style={{ marginLeft: "auto" }}>{extra}</div>}
      </div>
      {children}
      {footnote && (
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            color: token.colorTextSecondary,
          }}
        >
          {footnote}
        </div>
      )}
    </section>
  );
}
