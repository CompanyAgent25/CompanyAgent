"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/Layout";
import { ChatInterface } from "@/components/ChatInterface";
import { api } from "@/lib/api";
import type { Agent, Conversation, Message } from "@/lib/types";

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getConversation(params.id as string);
        setConversation(data);
        setMessages(data.messages || []);

        const agentData = await api.getAgent(data.agent_id);
        setAgent(agentData);
      } catch {
        router.push("/conversations");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id, router]);

  if (loading) {
    return (
      <AppLayout>
        <div className="animate-pulse h-96 bg-surface-2 rounded-xl" />
      </AppLayout>
    );
  }

  if (!conversation) return null;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <button
              onClick={() => router.push("/conversations")}
              className="text-sm text-gray-500 hover:text-gray-700 mb-1"
            >
              &larr; Back
            </button>
            <h1 className="text-xl font-bold text-gray-900">
              {conversation.title || "Conversation"}
            </h1>
            {agent && <p className="text-sm text-gray-500">with {agent.name}</p>}
          </div>
          <div className="flex items-center gap-2">
            {agent && (
              <span className={agent.execution_mode === "autonomous" ? "badge-yellow" : "badge-blue"}>
                {agent.execution_mode}
              </span>
            )}
          </div>
        </div>

        <div className="card flex-1 overflow-hidden p-0">
          <ChatInterface conversationId={params.id as string} initialMessages={messages} />
        </div>
      </div>
    </AppLayout>
  );
}
