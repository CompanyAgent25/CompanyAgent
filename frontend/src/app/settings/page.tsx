"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/Layout";
import { api } from "@/lib/api";
import type { McpServer } from "@/lib/types";

export default function SettingsPage() {
  const [servers, setServers] = useState<McpServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    transport: "stdio" as "stdio" | "sse",
    command: "",
    args: "",
    url: "",
  });

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getMcpServers();
        setServers(data);
      } catch {
        // handled
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const server = await api.createMcpServer({
        name: form.name,
        slug: form.slug,
        description: form.description,
        transport: form.transport,
        command: form.transport === "stdio" ? form.command : undefined,
        args: form.transport === "stdio" && form.args ? JSON.parse(form.args) : undefined,
        url: form.transport === "sse" ? form.url : undefined,
      });
      setServers([server, ...servers]);
      setShowCreate(false);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleHealthCheck = async (id: string) => {
    try {
      const result = await api.checkMcpHealth(id);
      setServers(
        servers.map((s) => (s.id === id ? { ...s, health_status: result.status as McpServer["health_status"] } : s))
      );
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleDiscover = async (id: string) => {
    try {
      const result = await api.discoverMcpTools(id);
      setServers(
        servers.map((s) =>
          s.id === id
            ? { ...s, discovered_tools: result.tools, discovered_resources: result.resources }
            : s
        )
      );
      alert(`Discovered ${result.tools.length} tools and ${result.resources.length} resources`);
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">MCP Servers</h1>
            <p className="text-gray-500 mt-1">Connect external systems to your agents</p>
          </div>
          <button onClick={() => setShowCreate(!showCreate)} className="btn-primary">
            {showCreate ? "Cancel" : "Add Server"}
          </button>
        </div>

        {showCreate && (
          <div className="card mb-8">
            <h2 className="text-lg font-semibold mb-4">Add MCP Server</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input type="text" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                  <input type="text" className="input" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transport</label>
                  <select className="input" value={form.transport} onChange={(e) => setForm({ ...form, transport: e.target.value as "stdio" | "sse" })}>
                    <option value="stdio">stdio</option>
                    <option value="sse">SSE</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input type="text" className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              {form.transport === "stdio" ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Command</label>
                    <input type="text" className="input" value={form.command} onChange={(e) => setForm({ ...form, command: e.target.value })} placeholder="npx" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Args (JSON array)</label>
                    <input type="text" className="input" value={form.args} onChange={(e) => setForm({ ...form, args: e.target.value })} placeholder='["-y", "@modelcontextprotocol/server-filesystem"]' />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                  <input type="url" className="input" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://mcp-server.example.com/sse" required />
                </div>
              )}
              <button type="submit" className="btn-primary" disabled={creating}>
                {creating ? "Adding..." : "Add Server"}
              </button>
            </form>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 bg-surface-2 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : servers.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg">No MCP servers configured</p>
            <p className="text-sm mt-1">Add a server to connect external systems</p>
          </div>
        ) : (
          <div className="space-y-3">
            {servers.map((server) => (
              <div key={server.id} className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{server.name}</h3>
                      <span className="badge-blue">{server.transport}</span>
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
                    <p className="text-sm text-gray-500 mt-1">{server.description || "No description"}</p>
                    {server.transport === "stdio" && server.command && (
                      <p className="text-xs text-gray-400 mt-1 font-mono">
                        {server.command} {(server.args as string[] | null)?.join(" ") || ""}
                      </p>
                    )}
                    {server.transport === "sse" && server.url && (
                      <p className="text-xs text-gray-400 mt-1 font-mono">{server.url}</p>
                    )}
                    {Array.isArray(server.discovered_tools) && server.discovered_tools.length > 0 && (
                      <p className="text-xs text-gray-500 mt-2">
                        {server.discovered_tools.length} tools discovered
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleHealthCheck(server.id)} className="btn-secondary text-sm">
                      Health Check
                    </button>
                    <button onClick={() => handleDiscover(server.id)} className="btn-secondary text-sm">
                      Discover
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
