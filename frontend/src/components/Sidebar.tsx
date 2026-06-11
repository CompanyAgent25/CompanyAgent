"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { useAuthStore } from "@/stores/auth";
import { localeLabels, locales, type MessageKey } from "@/lib/i18n";
import { useI18n } from "./I18nProvider";
import { useTheme, type ThemeMode } from "./ThemeProvider";

const navigation = [
  { label: "nav.dashboard", href: "/dashboard", icon: "grid" },
  { label: "nav.agents", href: "/agents", icon: "bot" },
  { label: "nav.conversations", href: "/conversations", icon: "message-square" },
  { label: "nav.skills", href: "/skills", icon: "zap" },
  { label: "nav.mcpServers", href: "/settings", icon: "server" },
  { label: "nav.admin", href: "/admin", icon: "shield" },
];

const icons: Record<string, JSX.Element> = {
  grid: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" />
    </svg>
  ),
  bot: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 110 2h-1v1a7 7 0 01-7 7H10a7 7 0 01-7-7v-1H2a1 1 0 110-2h1a7 7 0 017-7h1V5.73A2 2 0 0112 2zM9.5 14a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm5 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" />
    </svg>
  ),
  "message-square": (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  ),
  zap: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M13 2L3 14h9l-1 10 10-12h-9l1-10z" />
    </svg>
  ),
  server: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="2" y="2" width="20" height="8" rx="2" />
      <rect x="2" y="14" width="20" height="8" rx="2" />
      <circle cx="6" cy="6" r="1" fill="currentColor" />
      <circle cx="6" cy="18" r="1" fill="currentColor" />
    </svg>
  ),
  shield: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
};

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { locale, setLocale, t } = useI18n();
  const { mode, setMode } = useTheme();

  return (
    <aside className="w-64 bg-white border-r border-surface-3 flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-surface-3">
        <h1 className="text-xl font-bold text-gray-900">{t("app.name")}</h1>
        <p className="text-xs text-gray-500 mt-1">{t("app.tagline")}</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              pathname.startsWith(item.href)
                ? "bg-brand-50 text-brand-700"
                : "text-gray-600 hover:bg-surface-2 hover:text-gray-900"
            )}
          >
            {icons[item.icon]}
            {t(item.label as MessageKey)}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-surface-3">
        <div className="grid grid-cols-2 gap-2 mb-4">
          <label className="text-xs text-gray-500">
            {t("language.label")}
            <select
              className="input mt-1 py-1 text-xs"
              value={locale}
              onChange={(e) => setLocale(e.target.value as typeof locale)}
            >
              {locales.map((item) => (
                <option key={item} value={item}>
                  {localeLabels[item]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-gray-500">
            {t("theme.label")}
            <select
              className="input mt-1 py-1 text-xs"
              value={mode}
              onChange={(e) => setMode(e.target.value as ThemeMode)}
            >
              <option value="system">{t("theme.system")}</option>
              <option value="light">{t("theme.light")}</option>
              <option value="dark">{t("theme.dark")}</option>
            </select>
          </label>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 font-medium text-sm">
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.name || "User"}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="text-gray-400 hover:text-gray-600"
            title={t("auth.signOut")}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
