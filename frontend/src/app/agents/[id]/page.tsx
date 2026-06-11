"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/Layout";
import { api } from "@/lib/api";
import type { Agent } from "@/lib/types";

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{
    name: string;
    description: string;
    system_prompt: string;
    model: string;
    temperature: number;
    max_tokens: number;
    execution_mode: Agent["execution_mode"];
    is_active: boolean;
  }>({
    name: "",
    description: "",
    system_prompt: "",
    model: "",
    temperature: 0.7,
    max_tokens: 4096,
    execution_mode: "chat",
    is_active: true,
  });

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getAgent(params.id as string);
        setAgent(data);
        setForm({
          name: data.name,
          description: data.description || "",
          system_prompt: data.system_prompt,
          model: data.model,
          temperature: data.temperature,
          max_tokens: data.max_tokens,
          execution_mode: data.execution_mode,
          is_active: data.is_active,
        });
      } catch {
        router.push("/agents");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.updateAgent(params.id as string, form);
      setAgent(updated);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleStartChat = async () => {
    try {
      const conv = await api.createConversation(params.id as string, `Chat with ${agent?.name}`);
      router.push(`/conversations/${conv.id}`);
    } catch (err) {
      alert((err as Error).message);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-surface-2 rounded" />
          <div className="h-96 bg-surface-2 rounded-xl" />
        </div>
      </AppLayout>
    );
  }

  if (!agent) return null;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <button onClick={() => router.push("/agents")} className="text-sm text-gray-500 hover:text-gray-700 mb-2">
              &larr; Back to Agents
            </button>
            <h1 className="text-2xl font-bold text-gray-900">{agent.name}</h1>
          </div>
          <button onClick={handleStartChat} className="btn-primary">
            Start Chat
          </button>
        </div>

        {/* Skills & MCP Servers */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Skills ({agent.skills?.length || 0})</h3>
            {agent.skills && agent.skills.length > 0 ? (
              <div className="space-y-2">
                {agent.skills.map((skill) => (
                  <div key={skill.id} className="flex items-center justify-between p-2 bg-surface-1 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{skill.name}</p>
                      <p className="text-xs text-gray-500">{skill.handler_type}</p>
                    </div>
                    <span className={skill.is_active ? "badge-green" : "badge-gray"}>
                      {skill.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No skills assigned</p>
            )}
          </div>
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">MCP Servers ({agent.mcp_servers?.length || 0})</h3>
            {agent.mcp_servers && agent.mcp_servers.length > 0 ? (
              <div className="space-y-2">
                {agent.mcp_servers.map((server) => (
                  <div key={server.id} className="flex items-center justify-between p-2 bg-surface-1 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{server.name}</p>
                      <p className="text-xs text-gray-500">{server.transport}</p>
                    </div>
                    <span
                      className={
                        server.health_status === "healthy"
                          ? "badge-green"
                          : server.health_status === "unhealthy"
                          ? "badge-red"
                          : "badge-gray"
                      }
                    >
                      {server.health_status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No MCP servers connected</p>
            )}
          </div>
        </div>

        {/* Edit Form */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Configuration</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                <input
                  type="text"
                  className="input"
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                className="input"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">System Prompt</label>
              <textarea
                className="input font-mono text-sm"
                rows={8}
                value={form.system_prompt}
                onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Temperature</label>
                <input
                  type="number"
                  className="input"
                  min={0}
                  max={2}
                  step={0.1}
                  value={form.temperature}
                  onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Tokens</label>
                <input
                  type="number"
                  className="input"
                  min={100}
                  max={100000}
                  value={form.max_tokens}
                  onChange={(e) => setForm({ ...form, max_tokens: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
                <select
                  className="input"
                  value={form.execution_mode}
                  onChange={(e) => setForm({ ...form, execution_mode: e.target.value as Agent["execution_mode"] })}
                >
                  <option value="chat">Chat</option>
                  <option value="autonomous">Autonomous</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="rounded border-gray-300"
              />
              <label htmlFor="is_active" className="text-sm text-gray-700">Active</label>
            </div>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
