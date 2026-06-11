# CompanyAgent API Documentation

Base URL: `http://localhost:8080/api/v1`

## Authentication

All endpoints (except `/auth/*` and `/health`) require a Bearer token.

```
Authorization: Bearer <jwt_token>
```

### POST /auth/register
Create a new team and user.
```json
{
  "team_name": "My Company",
  "email": "admin@company.com",
  "password": "securepassword",
  "name": "Admin User"
}
```
**Response:** `{ "token": "...", "user": { ... } }`

### POST /auth/login
Authenticate and receive a JWT.
```json
{
  "email": "admin@company.com",
  "password": "securepassword"
}
```
**Response:** `{ "token": "...", "user": { ... } }`

---

## Agents

### GET /agents
List all agents for the current team.

Query params: `is_active` (bool), `limit` (int), `offset` (int)

### POST /agents
Create a new agent.
```json
{
  "name": "Research Assistant",
  "slug": "research-assistant",
  "description": "Searches and summarizes documents",
  "system_prompt": "You are a research assistant...",
  "model": "claude-sonnet-4-20250514",
  "temperature": 0.7,
  "max_tokens": 4096,
  "execution_mode": "chat",
  "skill_ids": ["uuid1", "uuid2"],
  "mcp_server_ids": ["uuid3"]
}
```

### GET /agents/:id
Get agent details with skills and MCP servers.

### PUT /agents/:id
Update agent configuration.

### DELETE /agents/:id
Delete an agent.

---

## Skills

### GET /skills
List all skills.

### POST /skills
Create a new skill.
```json
{
  "name": "Web Search",
  "slug": "web-search",
  "description": "Search the web",
  "handler_type": "python",
  "input_schema": { "type": "object", "properties": { "query": { "type": "string" } }, "required": ["query"] },
  "handler_config": { "module": "skills.web_search", "function": "execute" }
}
```

Handler types: `python`, `http`, `mcp_tool`

### GET /skills/:id
### PUT /skills/:id
### DELETE /skills/:id

---

## MCP Servers

### GET /mcp-servers
List all MCP servers. Requires `admin` or `owner` role.

### POST /mcp-servers
Register a new MCP server.
```json
{
  "name": "Filesystem",
  "slug": "filesystem",
  "transport": "stdio",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "/data"]
}
```

Transport types: `stdio` (requires `command`), `sse` (requires `url`)

### POST /mcp-servers/:id/health
Run a health check on the server.

### POST /mcp-servers/:id/discover
Discover available tools and resources.

### GET /mcp-servers/:id
### PUT /mcp-servers/:id
### DELETE /mcp-servers/:id

---

## Conversations

### GET /conversations
List conversations for the current user.

### POST /conversations
Start a new conversation.
```json
{
  "agent_id": "uuid",
  "title": "Research session"
}
```

### GET /conversations/:id
Get conversation with all messages.

### DELETE /conversations/:id
Archive a conversation.

### GET /conversations/:id/messages
Get messages only.

### POST /conversations/:id/messages
Send a message.
```json
{
  "content": "What is the revenue for Q4?"
}
```
Returns the user message immediately. Agent response is processed asynchronously.

---

## Tasks

### GET /tasks
List tasks. Query params: `status`, `agent_id`, `limit`, `offset`

### POST /tasks
Create and dispatch a task.
```json
{
  "agent_id": "uuid",
  "input": { "prompt": "Analyze quarterly sales data" }
}
```

### GET /tasks/:id
Get task details.

### POST /tasks/:id/cancel
Cancel a pending or running task.

---

## Health

### GET /health
Basic health check. Returns `{ "status": "ok" }`.

### GET /api/v1/health
Detailed health with DB and Redis status.
