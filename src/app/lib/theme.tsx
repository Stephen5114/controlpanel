import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "white" | "dark" | "warm";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/** 兼容旧版 "day" / "classic" → 新版映射 */
function migrateLegacyTheme(saved: string | null): Theme {
  if (saved === "white" || saved === "dark" || saved === "warm") return saved;
  if (saved === "day") return "white";
  if (saved === "classic") return "warm";
  return "white";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem("theme");
    return migrateLegacyTheme(saved);
  });

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("theme-dark", "theme-warm");
    if (theme !== "white") {
      root.classList.add(`theme-${theme}`);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
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
