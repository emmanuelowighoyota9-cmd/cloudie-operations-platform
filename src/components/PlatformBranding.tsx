import { useEffect } from "react";
import { brandCssVars } from "@/lib/platformConfig";
import { usePlatformConfig } from "@/hooks/use-platform-config";
import { useTheme } from "@/components/ThemeProvider";

/**
 * Applies admin-configured branding at runtime:
 *  - overrides the accent design tokens (light + dark) via a single <style> tag
 *  - keeps the browser/document title in sync with the configured product name
 * Mounted once, above the router, so every surface (public + authenticated) picks
 * up appearance changes live.
 */
export function PlatformBranding() {
  const { brand } = usePlatformConfig();
  const { setDefaultTheme } = useTheme();

  useEffect(() => {
    const id = "cloudie-brand-tokens";
    let el = document.getElementById(id) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = brandCssVars(brand);
  }, [brand]);

  // The administrator's "default theme" is the fallback for visitors who have
  // not chosen one themselves; `ThemeProvider` owns the class on <html> and the
  // per-visitor preference, so this only feeds it a default.
  useEffect(() => {
    setDefaultTheme(brand.defaultMode);
  }, [brand.defaultMode, setDefaultTheme]);

  useEffect(() => {
    document.title = `${brand.name} · ${brand.tagline}`;
  }, [brand.name, brand.tagline]);

  return null;
}
