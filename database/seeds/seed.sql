-- CompanyAgent — Seed Data for Development
BEGIN;

-- Default team
INSERT INTO teams (id, name, slug, plan) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Demo Company', 'demo', 'pro');

-- Admin user (password: admin123 — bcrypt hash)
INSERT INTO users (id, team_id, email, password_hash, name, role) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
     'admin@demo.com',
     '$2b$12$ricdsMW7nByVOcbeP3JSMuzcf4058J5EdCshuriEP.PfLea1YWZii',
     'Admin User', 'owner');

-- Sample agents
INSERT INTO agents (id, team_id, name, slug, description, system_prompt, execution_mode, created_by) VALUES
    ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
     'Research Assistant', 'research-assistant',
     'Searches documents, summarizes findings, answers questions from internal knowledge base.',
     'You are a research assistant. Search through available documents and knowledge bases to find accurate answers. Always cite your sources. If you cannot find information, say so clearly.',
     'chat', 'b0000000-0000-0000-0000-000000000001'),
    ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
     'Code Reviewer', 'code-reviewer',
     'Analyzes code for bugs, security issues, performance problems, and style violations.',
     'You are an expert code reviewer. Analyze code for bugs, security vulnerabilities, performance issues, and style problems. Provide actionable feedback with specific line references. Prioritize issues by severity.',
     'chat', 'b0000000-0000-0000-0000-000000000001'),
    ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
     'Task Automator', 'task-automator',
     'Executes multi-step workflows: file operations, API calls, data transformations.',
     'You are a task automation agent. Execute multi-step workflows autonomously. For each step, explain what you are doing and why. If a step fails, attempt recovery before reporting failure. Always validate inputs and outputs.',
     'autonomous', 'b0000000-0000-0000-0000-000000000001');

-- Sample skills
INSERT INTO skills (id, team_id, name, slug, description, input_schema, output_schema, handler_type, handler_config, created_by) VALUES
    ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
     'Web Search', 'web-search',
     'Search the web for information.',
     '{"type": "object", "properties": {"query": {"type": "string"}, "max_results": {"type": "integer", "default": 5}}, "required": ["query"]}',
     '{"type": "object", "properties": {"results": {"type": "array", "items": {"type": "object", "properties": {"title": {"type": "string"}, "url": {"type": "string"}, "snippet": {"type": "string"}}}}}}',
     'python',
     '{"module": "skills.web_search", "function": "execute"}',
     'b0000000-0000-0000-0000-000000000001'),
    ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
     'SQL Query', 'sql-query',
     'Execute read-only SQL queries against connected databases.',
     '{"type": "object", "properties": {"query": {"type": "string"}, "database": {"type": "string"}}, "required": ["query", "database"]}',
     '{"type": "object", "properties": {"columns": {"type": "array", "items": {"type": "string"}}, "rows": {"type": "array"}, "row_count": {"type": "integer"}}}',
     'python',
     '{"module": "skills.sql_query", "function": "execute"}',
     'b0000000-0000-0000-0000-000000000001'),
    ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
     'File Reader', 'file-reader',
     'Read and parse files (PDF, DOCX, CSV, JSON, etc.).',
     '{"type": "object", "properties": {"path": {"type": "string"}, "format": {"type": "string", "enum": ["auto", "pdf", "docx", "csv", "json", "text"]}}, "required": ["path"]}',
     '{"type": "object", "properties": {"content": {"type": "string"}, "metadata": {"type": "object"}}}',
     'python',
     '{"module": "skills.file_reader", "function": "execute"}',
     'b0000000-0000-0000-0000-000000000001');

-- Assign skills to agents
INSERT INTO agent_skills (agent_id, skill_id, priority) VALUES
    ('c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 1),
    ('c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003', 2),
    ('c0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000003', 1),
    ('c0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 1),
    ('c0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000002', 2),
    ('c0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003', 3);

-- Sample MCP server
INSERT INTO mcp_servers (id, team_id, name, slug, description, transport, command, args, created_by) VALUES
    ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
     'Filesystem', 'filesystem',
     'Access local filesystem for document reading and writing.',
     'stdio',
     'npx',
     '["-y", "@modelcontextprotocol/server-filesystem", "/data/documents"]',
     'b0000000-0000-0000-0000-000000000001');

-- Connect MCP server to agents
INSERT INTO agent_mcp_servers (agent_id, mcp_server_id, allowed_tools, allowed_resources) VALUES
    ('c0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001',
     '["read_file", "list_directory", "search_files"]', '["file://*"]'),
    ('c0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001',
     '["read_file", "write_file", "list_directory", "search_files"]', '["file://*"]');

COMMIT;
