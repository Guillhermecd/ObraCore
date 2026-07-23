import type { ReactNode } from "react";
import { createContext, useContext, useMemo, useState } from "react";

import {
  formatCompactCurrency as rawFormatCompactCurrency,
  formatCurrency as rawFormatCurrency,
  formatMeses as rawFormatMeses,
  formatPercent as rawFormatPercent,
} from "./utils/format";

interface PrivacyContextProps {
  readonly valuesHidden: boolean;
  readonly toggleValues: () => void;
}

const PrivacyContext = createContext<PrivacyContextProps | undefined>(
  undefined,
);

const STORAGE_KEY = "values-hidden";

export function PrivacyProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [valuesHidden, setValuesHidden] = useState<boolean>(
    () => localStorage.getItem(STORAGE_KEY) === "true",
  );

  const value = useMemo(
    () => ({
      valuesHidden,
      toggleValues: () =>
        setValuesHidden((prev) => {
          const next = !prev;
          localStorage.setItem(STORAGE_KEY, String(next));
          return next;
        }),
    }),
    [valuesHidden],
  );

  return (
    <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  const context = useContext(PrivacyContext);
  if (!context) {
    throw new Error("usePrivacy must be used within a PrivacyProvider");
  }
  return context;
}

/**
 * Formatadores com o mesmo nome e assinatura dos de `utils/format`, mas cientes
 * do modo "esconder valores": com ele ligado devolvem uma máscara em vez do
 * número. Mascarar a string (e não borrar via CSS) é o que faz os valores
 * sumirem também dentro dos gráficos, onde o texto é desenhado em canvas/SVG e
 * um filtro de CSS não alcança.
 */
export function usePrivacyFormat() {
  const { valuesHidden } = usePrivacy();

  return useMemo(
    () => ({
      formatCurrency: (value: number) =>
        valuesHidden ? "R$ ••••" : rawFormatCurrency(value),
      formatCompactCurrency: (value: number) =>
        valuesHidden ? "R$ ••" : rawFormatCompactCurrency(value),
      formatPercent: (value: number) => (valuesHidden ? "••%" : rawFormatPercent(value)),
      formatMeses: (value: number) =>
        valuesHidden ? "•• meses" : rawFormatMeses(value),
    }),
    [valuesHidden],
  );
}
