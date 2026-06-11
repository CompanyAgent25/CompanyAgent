"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/Layout";
import { api } from "@/lib/api";
import type { Agent, Conversation } from "@/lib/types";

export default function ConversationsPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState("");

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

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Conversations</h1>
            <p className="text-gray-500 mt-1">Chat with your AI agents</p>
          </div>
          <div className="flex gap-2">
            <select
              className="input w-48"
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
              className="btn-primary"
            >
              New Chat
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-surface-2 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg">No conversations yet</p>
            <p className="text-sm mt-1">Select an agent and start chatting</p>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map((conv) => {
              const agent = agents.find((a) => a.id === conv.agent_id);
              return (
                <Link
                  key={conv.id}
                  href={`/conversations/${conv.id}`}
                  className="card flex items-center justify-between hover:shadow-md transition-shadow"
                >
                  <div>
                    <p className="font-medium text-gray-900">{conv.title || "Untitled"}</p>
                    <p className="text-sm text-gray-500">with {agent?.name || "Unknown"}</p>
                  </div>
                  <div className="text-right">
                    <span className={conv.status === "active" ? "badge-green" : "badge-gray"}>
                      {conv.status}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">
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
