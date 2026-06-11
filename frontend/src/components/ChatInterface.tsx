"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bot, Loader2, SendHorizontal, UserRound } from "lucide-react";
import { api } from "@/lib/api";
import type { Message } from "@/lib/types";

interface ChatInterfaceProps {
  conversationId: string;
  initialMessages?: Message[];
}

function formatModel(model: string | null) {
  if (!model) return "model";
  return model.replace("deepseek-", "DeepSeek ");
}

export function ChatInterface({ conversationId, initialMessages = [] }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  const lastMessage = messages[messages.length - 1];
  const waitingForAssistant = sending || lastMessage?.role === "user";

  const suggestedPrompts = useMemo(
    () => [
      "Summarize the current project status",
      "Find the next highest-impact improvement",
      "Draft a deployment checklist",
    ],
    []
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = useCallback(async () => {
    try {
      const msgs = await api.getMessages(conversationId);
      setMessages(msgs);
    } catch {
      // Polling should never interrupt the writing flow.
    }
  }, [conversationId]);

  useEffect(() => {
    pollRef.current = setInterval(fetchMessages, 2000);
    return () => clearInterval(pollRef.current);
  }, [fetchMessages]);

  const handleSend = async (override?: string) => {
    const content = (override ?? input).trim();
    if (!content || sending) return;

    setInput("");
    setSending(true);

    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId,
      role: "user",
      content,
      token_count: null,
      model_used: null,
      cost_usd: null,
      metadata: {},
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMessage]);

    try {
      await api.sendMessage(conversationId, content);
      setTimeout(fetchMessages, 900);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          ...tempMessage,
          id: `error-${Date.now()}`,
          role: "system",
          content: `Error: ${(err as Error).message}`,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f7f7f4]">
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-10">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          {messages.length === 0 && (
            <div className="flex min-h-[48vh] flex-col items-center justify-center text-center">
              <div className="mb-5 grid h-14 w-14 place-items-center rounded-lg bg-neutral-950 text-white shadow-sm">
                <Bot className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-semibold tracking-normal text-neutral-950">
                Start with a precise objective.
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-neutral-500">
                Ask an agent to plan, analyze, create tasks, or prepare your deployment path.
              </p>
              <div className="mt-6 grid w-full gap-2 sm:grid-cols-3">
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => void handleSend(prompt)}
                    className="rounded-lg border border-neutral-200 bg-white px-3 py-3 text-left text-sm text-neutral-700 shadow-sm transition-colors hover:border-neutral-300 hover:bg-neutral-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => {
            const isUser = msg.role === "user";
            const isSystem = msg.role === "system";

            return (
              <article
                key={msg.id}
                className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <div
                    className={`mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                      isSystem ? "bg-red-50 text-red-700" : "bg-neutral-950 text-white"
                    }`}
                  >
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div className={`min-w-0 ${isUser ? "max-w-[82%]" : "max-w-[92%]"}`}>
                  <div
                    className={
                      isUser
                        ? "rounded-2xl rounded-tr-md bg-neutral-950 px-4 py-3 text-white shadow-sm"
                        : isSystem
                        ? "rounded-2xl rounded-tl-md border border-red-200 bg-red-50 px-4 py-3 text-red-800"
                        : "rounded-2xl rounded-tl-md border border-neutral-200 bg-white px-4 py-3 text-neutral-900 shadow-sm"
                    }
                  >
                    {!isUser && (
                      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-neutral-400">
                        <span>{isSystem ? "System" : "Agent"}</span>
                        {msg.model_used && <span>{formatModel(msg.model_used)}</span>}
                      </div>
                    )}
                    <div className="whitespace-pre-wrap text-sm leading-6">{msg.content}</div>
                  </div>
                  {!isUser && msg.token_count && (
                    <p className="mt-1 px-1 text-[11px] text-neutral-400">
                      {msg.token_count} tokens
                    </p>
                  )}
                </div>

                {isUser && (
                  <div className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-neutral-200 bg-white text-neutral-600">
                    <UserRound className="h-4 w-4" />
                  </div>
                )}
              </article>
            );
          })}

          {waitingForAssistant && (
            <div className="flex items-center gap-3 text-sm text-neutral-400">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-neutral-950 text-white">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
              Agent is thinking
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-neutral-200 bg-[#f7f7f4]/95 px-4 py-4 backdrop-blur sm:px-6 lg:px-10">
        <form
          className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-neutral-200 bg-white p-2 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSend();
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message CompanyAgent..."
            className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-3 py-3 text-sm leading-5 text-neutral-950 outline-none placeholder:text-neutral-400"
            rows={1}
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-neutral-950 text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400"
            title="Send message"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
          </button>
        </form>
        <p className="mx-auto mt-2 max-w-3xl px-2 text-[11px] text-neutral-400">
          Enter sends, Shift+Enter adds a new line.
        </p>
      </div>
    </div>
  );
}
