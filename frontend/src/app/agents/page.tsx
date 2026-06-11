"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/Layout";
import { AgentCard } from "@/components/AgentCard";
import { useAgentStore } from "@/stores/agents";

export default function AgentsPage() {
  const { agents, loading, fetchAgents, createAgent, deleteAgent } = useAgentStore();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    system_prompt: "",
    execution_mode: "chat" as "chat" | "autonomous",
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await createAgent(form);
      setShowCreate(false);
      setForm({ name: "", slug: "", description: "", system_prompt: "", execution_mode: "chat" });
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this agent? This action cannot be undone.")) return;
    try {
      await deleteAgent(id);
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Agents</h1>
            <p className="text-gray-500 mt-1">Manage your AI agents</p>
          </div>
          <button onClick={() => setShowCreate(!showCreate)} className="btn-primary">
            {showCreate ? "Cancel" : "New Agent"}
          </button>
        </div>

        {/* Create Form */}
        {showCreate && (
          <div className="card mb-8">
            <h2 className="text-lg font-semibold mb-4">Create Agent</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    className="input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Research Assistant"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                  <input
                    type="text"
                    className="input"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    placeholder="research-assistant"
                    required
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
                  placeholder="What does this agent do?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">System Prompt</label>
                <textarea
                  className="input"
                  rows={4}
                  value={form.system_prompt}
                  onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
                  placeholder="You are a specialized agent that..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Execution Mode</label>
                <select
                  className="input"
                  value={form.execution_mode}
                  onChange={(e) => setForm({ ...form, execution_mode: e.target.value as "chat" | "autonomous" })}
                >
                  <option value="chat">Chat (interactive)</option>
                  <option value="autonomous">Autonomous (task execution)</option>
                </select>
              </div>
              <button type="submit" className="btn-primary" disabled={creating}>
                {creating ? "Creating..." : "Create Agent"}
              </button>
            </form>
          </div>
        )}

        {/* Agent List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-surface-2 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg">No agents yet</p>
            <p className="text-sm mt-1">Create your first agent to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
