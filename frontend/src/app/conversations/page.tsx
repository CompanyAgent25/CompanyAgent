"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Circle, MessageSquareText, Plus, Search } from "lucide-react";
import { AppLayout } from "@/components/Layout";
import { api } from "@/lib/api";
import type { Agent, Conversation } from "@/lib/types";

export default function ConversationsPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [c, a] = await Promise.all([api.getConversations(), api.getAgents()]);
        setConversations(c);
        setAgents(a);
      } catch {
        // handled by auth
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleNewConversation = async () => {
    if (!selectedAgent) return;
    try {
      const agent = agents.find((a) => a.id === selectedAgent);
      const conv = await api.createConversation(selectedAgent, `Chat with ${agent?.name}`);
      router.push(`/conversations/${conv.id}`);
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const filteredConversations = conversations.filter((conv) =>
    `${conv.title || ""} ${agents.find((a) => a.id === conv.agent_id)?.name || ""}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-500">
              <MessageSquareText className="h-3.5 w-3.5" />
              Agent conversations
            </div>
            <h1 className="text-3xl font-semibold tracking-normal text-neutral-950">
              Chat workspace
            </h1>
            <p className="mt-2 text-sm leading-6 text-neutral-500">
              Start focused sessions with any active agent and keep the history scannable.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              className="input h-10 min-w-56"
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
            >
              <option value="">Select agent...</option>
              {agents
                .filter((a) => a.is_active)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
            <button
              onClick={handleNewConversation}
              disabled={!selectedAgent}
              className="btn-primary flex h-10 items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New chat
            </button>
          </div>
        </div>

        <div className="mb-4 flex h-11 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 shadow-sm">
          <Search className="h-4 w-4 text-neutral-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations..."
            className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400"
          />
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-white" />
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="rounded-lg border border-neutral-200 bg-white py-14 text-center text-neutral-400">
            <p className="text-base font-medium text-neutral-600">No conversations found</p>
            <p className="mt-1 text-sm">Select an agent and start a new chat.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
            {filteredConversations.map((conv, index) => {
              const agent = agents.find((a) => a.id === conv.agent_id);
              return (
                <Link
                  key={conv.id}
                  href={`/conversations/${conv.id}`}
                  className={`flex items-center justify-between gap-4 px-4 py-4 transition-colors hover:bg-neutral-50 ${
                    index > 0 ? "border-t border-neutral-100" : ""
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-neutral-950 text-white">
                      <MessageSquareText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-950">
                        {conv.title || "Untitled"}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-neutral-500">
                        {agent?.name || "Unknown agent"}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="mb-1 flex items-center justify-end gap-1.5 text-xs text-neutral-500">
                      <Circle
                        className={`h-2 w-2 ${
                          conv.status === "active"
                            ? "fill-emerald-500 text-emerald-500"
                            : "fill-neutral-300 text-neutral-300"
                        }`}
                      />
                      {conv.status}
                    </div>
                    <p className="text-xs text-neutral-400">
                      {new Date(conv.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
