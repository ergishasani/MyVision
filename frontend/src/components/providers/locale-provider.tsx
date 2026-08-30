"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import {
  DICTIONARIES,
  LOCALES,
  type Dictionary,
  type Locale,
} from "@/lib/i18n/dictionaries";

/* ---------------------------------------------------------------------------
 * Interface language.
 *
 * A React context rather than next-intl or next-i18next: those want every route under a
 * `/[locale]` segment, and this app has ~80 routes behind an auth guard with no need for
 * language-specific URLs. Moving them all would be a large restructure buying nothing — nobody
 * links to or indexes an authenticated invoice screen.
 *
 * <p>The choice lives in localStorage and is read through `useSyncExternalStore` rather than an
 * effect. That gives React a server snapshot to hydrate against, so the first paint is already in
 * the right language instead of flashing English, and the `storage` subscription keeps two open
 * tabs in agreement.
 * ------------------------------------------------------------------------ */

const STORAGE_KEY = "myvision.locale";

export const DEFAULT_LOCALE: Locale = "en";

function isLocale(value: string | null | undefined): value is Locale {
  return value != null && (LOCALES as readonly string[]).includes(value);
}

/* --- the store ------------------------------------------------------------ */

const listeners = new Set<() => void>();

/**
 * Cached so `getSnapshot` is cheap and, more importantly, referentially stable — React calls it on
 * every render and will loop forever if the value keeps changing.
 */
let cached: Locale | null = null;

function resolveLocale(): Locale {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isLocale(stored)) return stored;

    // No stored choice yet: take the browser's preference if we speak it, so a German user is
    // not made to go and find the switch first.
    const preferred = navigator.languages
      ?.map((tag) => tag.split("-")[0])
      .find(isLocale);
    return preferred ?? DEFAULT_LOCALE;
  } catch {
    // Private mode and blocked-storage browsers throw on access. The default is a fine answer.
    return DEFAULT_LOCALE;
  }
}

function getSnapshot(): Locale {
  cached ??= resolveLocale();
  return cached;
}

/** The server has no localStorage, so it always renders the default. */
function getServerSnapshot(): Locale {
  return DEFAULT_LOCALE;
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);

  // Fires only for writes from *other* tabs, which is exactly the case our own setter misses.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    cached = null;
    onChange();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function writeLocale(next: Locale) {
  cached = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Preference is lost on reload, but the current session still switches.
  }
  listeners.forEach((listener) => listener());
}

/* --- context -------------------------------------------------------------- */

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Dictionary;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setLocale = useCallback((next: Locale) => writeLocale(next), []);

  // Keeps <html lang> honest. Screen readers pick pronunciation from it, and it is what
  // `:lang()` and browser translation prompts key off. A DOM write, not React state.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, t: DICTIONARIES[locale] }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

function useLocaleContext(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used inside <LocaleProvider>");
  }
  return context;
}

export function useLocale() {
  const { locale, setLocale } = useLocaleContext();
  return { locale, setLocale };
}

/**
 * The active dictionary.
 *
 * <p>Returns the object itself rather than a `t("some.key")` lookup so every label is checked by
 * the compiler: `t.settings.general.title` either exists in both languages or the build fails.
 */
export function useT(): Dictionary {
  return useLocaleContext().t;
}
