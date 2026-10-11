"use client";

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";

type Theme = "light" | "dark";
const STORAGE_KEY = "stamp:theme";

/** Inlined in <head> so the right theme paints before React hydrates (no flash). Dark unless the visitor picked light. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}')==='light'?'light':'dark';document.documentElement.classList.toggle('dark',t==='dark');document.documentElement.style.colorScheme=t}catch(e){}})()`;

function subscribe(cb: () => void) {
  const observer = new MutationObserver(cb);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

const getSnapshot = (): Theme => (document.documentElement.classList.contains("dark") ? "dark" : "light");

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({ theme: "dark", toggle: () => {} });

function apply(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => "dark" as Theme);

  // Safety net: some responses (e.g. a 404 thrown from a dynamic page) arrive as Next's bare error shell and are
  // rendered on the client, where the inline <head> script never runs. Re-apply the stored choice once mounted.
  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "light" && getSnapshot() !== "light") apply("light");
    } catch {}
  }, []);

  const toggle = useCallback(() => {
    const next = getSnapshot() === "dark" ? "light" : "dark";
    apply(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  }, []);
  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
