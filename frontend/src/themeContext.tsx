import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState, useMemo } from "react";

type ThemeMode = "light" | "dark";

interface ThemeContextProps {
    readonly themeMode: ThemeMode;
    readonly toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

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

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}
