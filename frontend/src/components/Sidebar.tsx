"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  Bot,
  ChevronDown,
  Grid2X2,
  LogOut,
  MessageSquareText,
  Server,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { localeLabels, locales, type MessageKey } from "@/lib/i18n";
import { BrandMark } from "./BrandMark";
import { useI18n } from "./I18nProvider";
import { useTheme, type ThemeMode } from "./ThemeProvider";

const navigation = [
  { label: "nav.dashboard", href: "/dashboard", icon: Grid2X2 },
  { label: "nav.agents", href: "/agents", icon: Bot },
  { label: "nav.conversations", href: "/conversations", icon: MessageSquareText },
  { label: "nav.skills", href: "/skills", icon: Zap },
  { label: "nav.mcpServers", href: "/settings", icon: Server },
  { label: "nav.admin", href: "/admin", icon: ShieldCheck },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { locale, setLocale, t } = useI18n();
  const { mode, setMode } = useTheme();

  return (
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-black/10 bg-neutral-950 text-white lg:flex">
      <div className="border-b border-white/10 px-4 py-4">
        <BrandMark showWordmark tone="dark" />
      </div>

      <div className="px-3 py-3">
        <Link
          href="/conversations"
          className="flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white text-sm font-medium text-neutral-950 transition-colors hover:bg-neutral-100"
        >
          <Sparkles className="h-4 w-4" />
          New workspace chat
        </Link>
      </div>

      <nav className="flex-1 px-3 py-2">
        <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-normal text-white/35">
          Workspace
        </p>
        <div className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "group flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                  active
                    ? "bg-white/10 text-white"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon className={clsx("h-4 w-4", active ? "text-white" : "text-white/45")} />
                <span className="truncate">{t(item.label as MessageKey)}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="mb-3 grid grid-cols-2 gap-2">
          <label className="relative block">
            <span className="mb-1 block text-[11px] font-medium text-white/35">
              {t("language.label")}
            </span>
            <select
              className="h-9 w-full appearance-none rounded-lg border border-white/10 bg-white/5 px-3 pr-7 text-xs text-white outline-none transition-colors hover:bg-white/10"
              value={locale}
              onChange={(e) => setLocale(e.target.value as typeof locale)}
            >
              {locales.map((item) => (
                <option key={item} value={item}>
                  {localeLabels[item]}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute bottom-2.5 right-2 h-4 w-4 text-white/35" />
          </label>
          <label className="relative block">
            <span className="mb-1 block text-[11px] font-medium text-white/35">
              {t("theme.label")}
            </span>
            <select
              className="h-9 w-full appearance-none rounded-lg border border-white/10 bg-white/5 px-3 pr-7 text-xs text-white outline-none transition-colors hover:bg-white/10"
              value={mode}
              onChange={(e) => setMode(e.target.value as ThemeMode)}
            >
              <option value="system">{t("theme.system")}</option>
              <option value="light">{t("theme.light")}</option>
              <option value="dark">{t("theme.dark")}</option>
            </select>
            <ChevronDown className="pointer-events-none absolute bottom-2.5 right-2 h-4 w-4 text-white/35" />
          </label>
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-sm font-semibold text-neutral-950">
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user?.name || "User"}</p>
            <p className="truncate text-xs text-white/40">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="grid h-8 w-8 place-items-center rounded-lg text-white/45 transition-colors hover:bg-white/10 hover:text-white"
            title={t("auth.signOut")}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
