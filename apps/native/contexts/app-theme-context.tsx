import React, { createContext, useContext, useEffect, useMemo } from "react";
import { Uniwind, useUniwind } from "uniwind";

type AppThemeContextType = {
  currentTheme: string;
  isLight: boolean;
  isDark: boolean;
};

const AppThemeContext = createContext<AppThemeContextType | undefined>(undefined);

export const AppThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { theme } = useUniwind();

  useEffect(() => {
    Uniwind.setTheme("light");
  }, []);

  const isLight = useMemo(() => {
    return theme === "light";
  }, [theme]);

  const isDark = useMemo(() => theme === "dark", [theme]);

  const value = useMemo(
    () => ({
      currentTheme: theme,
      isLight,
      isDark,
    }),
    [theme, isLight, isDark],
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
};

export function useAppTheme() {
  const context = useContext(AppThemeContext);
  if (!context) {
    throw new Error("useAppTheme must be used within AppThemeProvider");
  }
  return context;
}
