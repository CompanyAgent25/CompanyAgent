"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Bot, Circle } from "lucide-react";
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
        <div className="h-[calc(100vh-7rem)] animate-pulse rounded-lg bg-white" />
      </AppLayout>
    );
  }

  if (!conversation) return null;

  return (
    <AppLayout>
      <div className="mx-auto flex h-[calc(100vh-7rem)] max-w-6xl flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
        <div className="flex min-h-16 items-center justify-between gap-4 border-b border-neutral-200 bg-white px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => router.push("/conversations")}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-neutral-200 text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-950"
              title="Back to conversations"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold tracking-normal text-neutral-950">
                {conversation.title || "Conversation"}
              </h1>
              <div className="mt-0.5 flex min-w-0 items-center gap-2 text-xs text-neutral-500">
                <Bot className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{agent?.name || "Agent"}</span>
              </div>
            </div>
          </div>

          {agent && (
            <div className="hidden items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-medium text-neutral-600 sm:flex">
              <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500" />
              {agent.execution_mode}
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1">
          <ChatInterface conversationId={params.id as string} initialMessages={messages} />
        </div>
      </div>
    </AppLayout>
  );
}
