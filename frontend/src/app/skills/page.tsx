"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/Layout";
import { api } from "@/lib/api";
import type { Skill } from "@/lib/types";

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    handler_type: "python" as "python" | "http" | "mcp_tool",
    input_schema: '{"type": "object", "properties": {}}',
    handler_config: '{}',
  });

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getSkills();
        setSkills(data);
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
      const skill = await api.createSkill({
        name: form.name,
        slug: form.slug,
        description: form.description,
        handler_type: form.handler_type,
        input_schema: JSON.parse(form.input_schema),
        handler_config: JSON.parse(form.handler_config),
      });
      setSkills([skill, ...skills]);
      setShowCreate(false);
      setForm({ name: "", slug: "", description: "", handler_type: "python", input_schema: '{"type": "object", "properties": {}}', handler_config: '{}' });
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this skill?")) return;
    try {
      await api.deleteSkill(id);
      setSkills(skills.filter((s) => s.id !== id));
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Skills</h1>
            <p className="text-gray-500 mt-1">Executable capabilities for your agents</p>
          </div>
          <button onClick={() => setShowCreate(!showCreate)} className="btn-primary">
            {showCreate ? "Cancel" : "New Skill"}
          </button>
        </div>

        {showCreate && (
          <div className="card mb-8">
            <h2 className="text-lg font-semibold mb-4">Create Skill</h2>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Handler Type</label>
                  <select className="input" value={form.handler_type} onChange={(e) => setForm({ ...form, handler_type: e.target.value as "python" | "http" | "mcp_tool" })}>
                    <option value="python">Python</option>
                    <option value="http">HTTP</option>
                    <option value="mcp_tool">MCP Tool</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input type="text" className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Input Schema (JSON)</label>
                  <textarea className="input font-mono text-sm" rows={4} value={form.input_schema} onChange={(e) => setForm({ ...form, input_schema: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Handler Config (JSON)</label>
                  <textarea className="input font-mono text-sm" rows={4} value={form.handler_config} onChange={(e) => setForm({ ...form, handler_config: e.target.value })} />
                </div>
              </div>
              <button type="submit" className="btn-primary" disabled={creating}>
                {creating ? "Creating..." : "Create Skill"}
              </button>
            </form>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-surface-2 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : skills.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg">No skills yet</p>
            <p className="text-sm mt-1">Create skills to give your agents capabilities</p>
          </div>
        ) : (
          <div className="space-y-3">
            {skills.map((skill) => (
              <div key={skill.id} className="card flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">{skill.name}</h3>
                    <span className="badge-blue">{skill.handler_type}</span>
                    <span className="badge-gray">v{skill.version}</span>
                    <span className={skill.is_active ? "badge-green" : "badge-red"}>
                      {skill.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{skill.description || "No description"}</p>
                </div>
                <button onClick={() => handleDelete(skill.id)} className="text-sm text-red-500 hover:text-red-700 ml-4">
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
