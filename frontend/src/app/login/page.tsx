"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, LockKeyhole } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { useAuthStore } from "@/stores/auth";

export default function LoginPage() {
  const router = useRouter();
  const { login, register } = useAuthStore();
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    teamName: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        await register(form.teamName, form.email, form.password, form.name);
      } else {
        await login(form.email, form.password);
      }
      router.push("/dashboard");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen bg-[#f7f7f4] text-neutral-950 lg:grid-cols-[1fr_520px]">
      <section className="hidden min-h-screen flex-col justify-between bg-neutral-950 p-8 text-white lg:flex">
        <BrandMark showWordmark tone="dark" />

        <div className="max-w-xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/60">
            <LockKeyhole className="h-3.5 w-3.5" />
            Local multi-agent control plane
          </div>
          <h1 className="max-w-lg text-5xl font-semibold leading-tight tracking-normal">
            Build, route, and test AI agents from one workspace.
          </h1>
          <div className="mt-8 grid max-w-lg gap-3 text-sm text-white/65">
            {["Model-agnostic chat", "Agent, skill, and MCP management", "Docker-ready local stack"].map(
              (item) => (
                <div key={item} className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  {item}
                </div>
              )
            )}
          </div>
        </div>

        <p className="text-xs text-white/35">CompanyAgent workspace</p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <BrandMark showWordmark tone="light" />
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-7">
              <p className="text-sm font-medium text-neutral-500">
                {isRegister ? "Create workspace" : "Welcome back"}
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-normal text-neutral-950">
                {isRegister ? "Start CompanyAgent" : "Sign in to CompanyAgent"}
              </h2>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <>
                  <label className="block text-sm font-medium text-neutral-700">
                    Team name
                    <input
                      type="text"
                      className="input mt-1.5"
                      value={form.teamName}
                      onChange={(e) => setForm({ ...form, teamName: e.target.value })}
                      placeholder="Your company name"
                      required
                    />
                  </label>
                  <label className="block text-sm font-medium text-neutral-700">
                    Full name
                    <input
                      type="text"
                      className="input mt-1.5"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="John Doe"
                      required
                    />
                  </label>
                </>
              )}

              <label className="block text-sm font-medium text-neutral-700">
                Email
                <input
                  type="email"
                  className="input mt-1.5"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@company.com"
                  required
                />
              </label>

              <label className="block text-sm font-medium text-neutral-700">
                Password
                <input
                  type="password"
                  className="input mt-1.5"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Min. 8 characters"
                  minLength={8}
                  required
                />
              </label>

              <button
                type="submit"
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-neutral-950 px-4 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
                disabled={loading}
              >
                {loading ? "Loading..." : isRegister ? "Create account" : "Sign in"}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>

            <div className="mt-5 text-center text-sm text-neutral-500">
              {isRegister ? "Already have an account?" : "Need a workspace?"}{" "}
              <button
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError("");
                }}
                className="font-medium text-neutral-950 hover:underline"
              >
                {isRegister ? "Sign in" : "Create one"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
