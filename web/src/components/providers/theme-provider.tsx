"use client";

import { createContext, useCallback, useContext, useSyncExternalStore, type ReactNode } from "react";

type Theme = "light" | "dark";
const STORAGE_KEY = "stamp:theme";

/** Inlined in <head> so the right theme paints before React hydrates (no flash). */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');if(!t){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.classList.toggle('dark',t==='dark');document.documentElement.style.colorScheme=t}catch(e){}})()`;

function subscribe(cb: () => void) {
  const observer = new MutationObserver(cb);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

const getSnapshot = (): Theme => (document.documentElement.classList.contains("dark") ? "dark" : "light");

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({ theme: "light", toggle: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => "light" as Theme);
  const toggle = useCallback(() => {
    const next = getSnapshot() === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    document.documentElement.style.colorScheme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  }, []);
  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
