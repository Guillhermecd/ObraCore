import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { PrivacyContext } from "./privacyContext";

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
