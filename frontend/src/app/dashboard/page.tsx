"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/Layout";
import { KPICard } from "@/components/Dashboard/KPICard";
import { AgentStatus } from "@/components/Dashboard/AgentStatus";
import { api } from "@/lib/api";
import type { Agent, Conversation, Task } from "@/lib/types";

export default function DashboardPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [a, c, t] = await Promise.all([
          api.getAgents(),
          api.getConversations(),
          api.getTasks(),
        ]);
        setAgents(a);
        setConversations(c);
        setTasks(t);
      } catch {
        // Will redirect to login if unauthorized
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const activeTasks = tasks.filter((t) => t.status === "running" || t.status === "pending");
  const completedTasks = tasks.filter((t) => t.status === "completed");
  const failedTasks = tasks.filter((t) => t.status === "failed");

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview of your multi-agent platform</p>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-surface-2 rounded-xl" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <KPICard
                title="Active Agents"
                value={agents.filter((a) => a.is_active).length}
                change={`${agents.length} total`}
                trend="neutral"
                icon={
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 110 2h-1v1a7 7 0 01-7 7H10a7 7 0 01-7-7v-1H2a1 1 0 110-2h1a7 7 0 017-7h1V5.73A2 2 0 0112 2z" />
                  </svg>
                }
              />
              <KPICard
                title="Conversations"
                value={conversations.length}
                change="All time"
                trend="up"
                icon={
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                  </svg>
                }
              />
              <KPICard
                title="Active Tasks"
                value={activeTasks.length}
                change={`${completedTasks.length} completed`}
                trend="neutral"
                icon={
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                }
              />
              <KPICard
                title="Failed Tasks"
                value={failedTasks.length}
                change={failedTasks.length > 0 ? "Needs attention" : "All clear"}
                trend={failedTasks.length > 0 ? "down" : "neutral"}
                icon={
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Agent Status */}
              <AgentStatus agents={agents} />

              {/* Recent Conversations */}
              <div className="card lg:col-span-2">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Recent Conversations</h3>
                {conversations.length === 0 ? (
                  <p className="text-sm text-gray-400">No conversations yet</p>
                ) : (
                  <div className="space-y-3">
                    {conversations.slice(0, 10).map((conv) => {
                      const agent = agents.find((a) => a.id === conv.agent_id);
                      return (
                        <a
                          key={conv.id}
                          href={`/conversations/${conv.id}`}
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-2 transition-colors"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {conv.title || "Untitled"}
                            </p>
                            <p className="text-xs text-gray-500">
                              with {agent?.name || "Unknown Agent"}
                            </p>
                          </div>
                          <span className="text-xs text-gray-400">
                            {new Date(conv.updated_at).toLocaleDateString()}
                          </span>
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Tasks */}
            <div className="card mt-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Recent Tasks</h3>
              {tasks.length === 0 ? (
                <p className="text-sm text-gray-400">No tasks executed yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b border-surface-3">
                        <th className="pb-3 font-medium">Agent</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium">Duration</th>
                        <th className="pb-3 font-medium">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-3">
                      {tasks.slice(0, 10).map((task) => {
                        const agent = agents.find((a) => a.id === task.agent_id);
                        return (
                          <tr key={task.id}>
                            <td className="py-3">{agent?.name || task.agent_id.slice(0, 8)}</td>
                            <td className="py-3">
                              <span
                                className={
                                  task.status === "completed"
                                    ? "badge-green"
                                    : task.status === "failed"
                                    ? "badge-red"
                                    : task.status === "running"
                                    ? "badge-blue"
                                    : "badge-gray"
                                }
                              >
                                {task.status}
                              </span>
                            </td>
                            <td className="py-3 text-gray-500">
                              {task.duration_ms ? `${(task.duration_ms / 1000).toFixed(1)}s` : "-"}
                            </td>
                            <td className="py-3 text-gray-500">
                              {new Date(task.created_at).toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
