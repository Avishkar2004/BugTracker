import { useCallback, useEffect, useState } from "react";

/*
 * Theme state. The storage key and the class name must stay in sync with the
 * inline bootstrap script in index.html — that script is what prevents the
 * flash of wrong theme, this module only handles changes after mount.
 */
const KEY = "bt-theme";
const QUERY = "(prefers-color-scheme: dark)";

function stored() {
  try {
    const value = localStorage.getItem(KEY);
    return value === "dark" || value === "light" ? value : null;
  } catch {
    return null;
  }
}

function systemTheme() {
  return window.matchMedia(QUERY).matches ? "dark" : "light";
}

function apply(theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  // Keeps native controls (scrollbars, date pickers, autofill) in the same theme.
  root.style.colorScheme = theme;
}

export function useTheme() {
  const [theme, setTheme] = useState(() => stored() ?? systemTheme());
  // Only follow the OS while the reader has not made an explicit choice.
  const [pinned, setPinned] = useState(() => stored() !== null);

  useEffect(() => {
    apply(theme);
  }, [theme]);

  useEffect(() => {
    if (pinned) return undefined;
    const media = window.matchMedia(QUERY);
    const onChange = (event) => setTheme(event.matches ? "dark" : "light");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [pinned]);

  const toggle = useCallback(() => {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(KEY, next);
      } catch {
        /* storage unavailable — the choice just will not survive a reload */
      }
      return next;
    });
    setPinned(true);
  }, []);

  return { theme, toggle };
}
