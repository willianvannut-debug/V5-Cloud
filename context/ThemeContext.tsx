"use client";
import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  toggleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("v5_theme") as Theme | null;
      if (saved === "light" || saved === "dark") {
        setThemeState(saved);
      }
    } catch {}
  }, []);

  function setTheme(t: Theme) {
    setThemeState(t);
    try { localStorage.setItem("v5_theme", t); } catch {}
  }

  function toggleTheme() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {/*
        IMPORTANTE: o tema claro/escuro é aplicado SOMENTE dentro desta div
        (via classe "dark" escopada em ".v5-dashboard-root"), nunca em
        document.documentElement. O <html> é compartilhado por TODO o site
        (inclusive a página de vendas), então mexer nele aqui vazava o tema
        claro do painel para fora do /dashboard. "display: contents" faz essa
        div não interferir em nada no layout (flex/grid) de dentro.
      */}
      <div
        className={`v5-dashboard-root${theme === "dark" ? " dark" : ""}`}
        style={{ display: "contents" }}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
