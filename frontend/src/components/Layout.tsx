"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MessageSquareText, Sparkles } from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { BrandMark } from "./BrandMark";
import { Sidebar } from "./Sidebar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading, initialize } = useAuthStore();

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950">
        <div className="flex items-center gap-3 text-white/60">
          <BrandMark size="sm" tone="dark" />
          <span className="animate-pulse text-sm">Loading workspace...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[#f7f7f4] text-neutral-950 dark:bg-dark-0 dark:text-gray-100">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-neutral-200 bg-white/95 px-4 backdrop-blur lg:hidden">
        <BrandMark size="sm" showWordmark tone="light" />
        <div className="flex items-center gap-1">
          <Link
            href="/conversations"
            className="grid h-9 w-9 place-items-center rounded-lg text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"
            title="Conversations"
          >
            <MessageSquareText className="h-4 w-4" />
          </Link>
          <Link
            href="/dashboard"
            className="grid h-9 w-9 place-items-center rounded-lg bg-neutral-950 text-white"
            title="Dashboard"
          >
            <Sparkles className="h-4 w-4" />
          </Link>
        </div>
      </header>
      <div className="flex min-h-[calc(100vh-3.5rem)] lg:min-h-screen">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-auto px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
