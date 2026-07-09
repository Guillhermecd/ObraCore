import { Grid, theme } from "antd";
import type { CSSProperties, ReactNode } from "react";

type Props = {
  title: string;
  description: string;
  actions?: ReactNode;
};

/**
 * Cabeçalho padrão de página (título + descrição, opcionalmente com ações à
 * direita) — mesmo bloco antes duplicado em Controle, Grupos e Perfil.
 * Título/descrição somem no mobile (o nome da página já aparece no header
 * mobile via `usePrivateMobileHeader`); `actions` fica sempre visível.
 */
export function PageHeader({ title, description, actions }: Readonly<Props>) {
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const isDesktop = Boolean(screens.md);

  const rowStyle: CSSProperties = actions
    ? {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 12,
        marginBottom: 20,
      }
    : { marginBottom: 20 };

  const titleStyle: CSSProperties = {
    margin: 0,
    color: token.colorTextHeading,
    fontSize: 26,
  };

  const descriptionStyle: CSSProperties = {
    margin: "4px 0 0",
    color: token.colorTextSecondary,
  };

  return (
    <div style={rowStyle}>
      {isDesktop && (
        <div>
          <h1 style={titleStyle}>{title}</h1>
          <p style={descriptionStyle}>{description}</p>
        </div>
      )}
      {actions}
    </div>
  );
}
