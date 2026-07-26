import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ThemeContext, type ThemeMode } from "./themeContext";

export function ThemeProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem("theme-mode");
    return (saved as ThemeMode) || "light";
  });

  const toggleTheme = () => {
    setThemeMode((prev) => {
      const next = prev === "light" ? "dark" : "light";
      localStorage.setItem("theme-mode", next);
      return next;
    });
  };

  useEffect(() => {
    if (themeMode === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [themeMode]);

  const value = useMemo(() => ({ themeMode, toggleTheme }), [themeMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
