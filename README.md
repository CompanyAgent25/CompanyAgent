# CompanyAgent

Enterprise Multi-Agent AI Platform — Specialized agents with modular skills and MCP server connections for controlled, secure system integration.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────────┐
│   Frontend   │────▶│   Rust API   │────▶│  Python Services │
│   (Next.js)  │     │   (axum)     │     │  (FastAPI + LLM) │
└─────────────┘     └──────┬───────┘     └────────┬─────────┘
                           │                       │
                    ┌──────┴───────┐        ┌──────┴──────┐
                    │  PostgreSQL  │        │ MCP Servers  │
                    │  + Redis     │        │ (stdio/SSE)  │
                    └──────────────┘        └─────────────┘
```

**Rust API** — High-performance gateway: auth, routing, rate limiting, CRUD
**Python Services** — AI layer: LLM orchestration, skill execution, MCP management
**Frontend** — Dashboard: agent management, chat interface, monitoring

## Quick Start

```bash
cp .env.example .env
# Edit .env — set your LLM provider and API key

docker-compose up --build

# Frontend: http://localhost:3000
# Rust API: http://localhost:8080
# Python API: http://localhost:8000
```

For production, run the migration schema only and create the first user through
the app registration flow. No shared demo account is shipped in the seed data.

## Model Providers

CompanyAgent is designed to run with hosted and self-hosted models. Set
`LLM_PROVIDER`, `LLM_MODEL`, `LLM_API_KEY`, and optionally `LLM_BASE_URL`.

Examples:

```bash
# Anthropic
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=replace-with-anthropic-key
LLM_MODEL=claude-sonnet-4-20250514

# DeepSeek or another OpenAI-compatible provider
LLM_PROVIDER=deepseek
LLM_API_KEY=replace-with-provider-key
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_MODEL=deepseek-chat

# Local Ollama with OpenAI-compatible endpoint
LLM_PROVIDER=ollama
LLM_BASE_URL=http://host.docker.internal:11434/v1
LLM_MODEL=llama3.1
```

## Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| API Gateway | Rust (axum) | High concurrency, memory safety, sub-ms routing |
| AI Services | Python (FastAPI) | Anthropic SDK, ML ecosystem, rapid prototyping |
| Frontend | Next.js + Tailwind | SSR, App Router, fast dev cycle |
| Database | PostgreSQL | JSONB for flexible schemas, robust transactions |
| Cache | Redis | Session cache, rate limiting, pub/sub |
| Infra | Docker + GitHub Actions | Reproducible builds, automated CI/CD |

## Project Structure

```
companyagent/
├── backend/
│   ├── rust-api/           # API gateway + orchestrator
│   │   ├── src/
│   │   │   ├── main.rs     # Server setup
│   │   │   ├── routes/     # API endpoints
│   │   │   ├── models/     # Data models
│   │   │   ├── middleware/  # Auth, rate limiting
│   │   │   └── utils/
│   │   └── tests/
│   └── python-services/    # AI/ML services
│       ├── app/
│       │   ├── services/   # LLM, orchestrator, MCP, skills
│       │   ├── api/        # FastAPI routes
│       │   └── models/     # Pydantic schemas
│       └── tests/
├── frontend/               # Next.js dashboard
│   └── src/
│       ├── app/            # Pages (App Router)
│       ├── components/     # UI components
│       ├── stores/         # Zustand state
│       └── lib/            # API client, types
├── database/
│   ├── migrations/         # SQL schema
│   └── seeds/              # Dev data
├── infra/                  # Dockerfiles, CI/CD
├── docs/                   # API documentation
└── docker-compose.yml
```

## Development

```bash
# Run individual services
make build-rust
make build-python
make build-frontend

# Tests
make test

# Lint
make lint
```

## API

See [docs/API.md](docs/API.md) for the full API reference.

## Deployment

The recommended production split is:

- Netlify: Next.js frontend
- Supabase: PostgreSQL database
- Managed Redis: Upstash, Redis Cloud, Railway Redis, or equivalent
- Container/API host: Rust API and Python AI service

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the full checklist.
