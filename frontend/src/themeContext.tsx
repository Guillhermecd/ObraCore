import { createContext, useContext } from "react";

export type ThemeMode = "light" | "dark";

export interface ThemeContextProps {
  readonly themeMode: ThemeMode;
  readonly toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
