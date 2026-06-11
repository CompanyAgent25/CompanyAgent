export const locales = ["en", "fr", "es", "zh-CN"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeLabels: Record<Locale, string> = {
  en: "English",
  fr: "Francais",
  es: "Espanol",
  "zh-CN": "中文",
};

const en = {
  "app.name": "CompanyAgent",
  "app.tagline": "Multi-Agent Platform",
  "nav.dashboard": "Dashboard",
  "nav.agents": "Agents",
  "nav.conversations": "Conversations",
  "nav.skills": "Skills",
  "nav.mcpServers": "MCP Servers",
  "nav.admin": "Admin",
  "theme.light": "Light",
  "theme.dark": "Dark",
  "theme.system": "System",
  "language.label": "Language",
  "theme.label": "Theme",
  "auth.signOut": "Sign out",
} as const;

export type MessageKey = keyof typeof en;

export const messages: Record<Locale, Record<MessageKey, string>> = {
  en,
  fr: {
    "app.name": "CompanyAgent",
    "app.tagline": "Plateforme multi-agent",
    "nav.dashboard": "Tableau de bord",
    "nav.agents": "Agents",
    "nav.conversations": "Conversations",
    "nav.skills": "Skills",
    "nav.mcpServers": "Serveurs MCP",
    "nav.admin": "Admin",
    "theme.light": "Clair",
    "theme.dark": "Sombre",
    "theme.system": "Systeme",
    "language.label": "Langue",
    "theme.label": "Theme",
    "auth.signOut": "Se deconnecter",
  },
  es: {
    "app.name": "CompanyAgent",
    "app.tagline": "Plataforma multiagente",
    "nav.dashboard": "Panel",
    "nav.agents": "Agentes",
    "nav.conversations": "Conversaciones",
    "nav.skills": "Skills",
    "nav.mcpServers": "Servidores MCP",
    "nav.admin": "Admin",
    "theme.light": "Claro",
    "theme.dark": "Oscuro",
    "theme.system": "Sistema",
    "language.label": "Idioma",
    "theme.label": "Tema",
    "auth.signOut": "Cerrar sesion",
  },
  "zh-CN": {
    "app.name": "CompanyAgent",
    "app.tagline": "多智能体平台",
    "nav.dashboard": "仪表盘",
    "nav.agents": "智能体",
    "nav.conversations": "对话",
    "nav.skills": "技能",
    "nav.mcpServers": "MCP 服务器",
    "nav.admin": "管理",
    "theme.light": "浅色",
    "theme.dark": "深色",
    "theme.system": "跟随系统",
    "language.label": "语言",
    "theme.label": "主题",
    "auth.signOut": "退出登录",
  },
};

export function isLocale(value: string | null): value is Locale {
  return locales.includes(value as Locale);
}
