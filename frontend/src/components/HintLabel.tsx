import { QuestionCircleOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";
import type { ReactNode } from "react";

type HintLabelProps = {
  label: ReactNode;
  hint?: string;
  /** Omitido = ícone no tamanho padrão do AntD (usado pelo `Kpi`, que não
   * define tamanho próprio). Os demais indicadores pedem 11 explicitamente. */
  iconFontSize?: number;
};

/**
 * Rótulo + ícone de ajuda com tooltip — átomo repetido em todo indicador
 * financeiro da aplicação (Kpi, DetailCard, cards de obra, resumo
 * executivo). Cada chamador mantém seu próprio container (flex/gap, cor);
 * este componente só resolve o par label+tooltip em si.
 */
export function HintLabel({ label, hint, iconFontSize }: HintLabelProps) {
  return (
    <>
      {label}
      {hint && (
        <Tooltip title={hint}>
          <QuestionCircleOutlined
            style={{ cursor: "help", ...(iconFontSize ? { fontSize: iconFontSize } : {}) }}
          />
        </Tooltip>
      )}
    </>
  );
}
