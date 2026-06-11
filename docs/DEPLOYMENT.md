# CompanyAgent Deployment Checklist

This project is a fullstack app with three runtime services:

- Frontend: Next.js, deployable on Netlify.
- Rust API: auth, CRUD, conversations, tasks.
- Python AI service: LLM orchestration, task execution, MCP checks.

Netlify should host the frontend only. The Rust API and Python AI service need
a container/API host such as Railway, Render, Fly.io, a VPS, or Kubernetes.
Supabase replaces PostgreSQL, but you still need a managed Redis URL.

## Current Deployment Targets

- GitHub owner/org: `CompanyAgent25`
- Supabase project ref: `pjyencoffltxrhnxlzhs`
- Netlify: frontend hosting

These identifiers are safe to keep in documentation. Do not commit Supabase
database passwords, Netlify tokens, GitHub tokens, Redis URLs, or LLM keys.

## Production Blocker

Before a public launch, upgrade Next.js and rerun `npm audit --omit=dev` from
`frontend/`. The local stack currently builds and passes smoke tests, but the
installed Next.js version is still reported by `npm audit` with a critical
production vulnerability. Treat this as a launch blocker, not a cosmetic warning.

## 1. GitHub

1. Push the repository to GitHub.
2. Keep `.env`, `.env.save`, logs, and local generated files out of Git.
3. Never commit provider keys, JWT secrets, Supabase passwords, or Redis URLs.

## 2. Supabase

1. Create a Supabase project.
2. Open the SQL editor.
3. Run `database/migrations/001_initial.sql`.
4. Do not run `database/seeds/seed.sql` in production.
5. Copy the production Postgres connection string for `DATABASE_URL`.

Use the Supabase pooler connection string when your backend host has limited
connection capacity. Both Rust and Python services need the same `DATABASE_URL`.

## 3. Managed Redis

Create a Redis database with a provider such as Upstash, Redis Cloud, or Railway
Redis. Set the resulting URL as `REDIS_URL` in both backend services.

## 4. Backend Deployment

Deploy two services from the same GitHub repository.

### Rust API service

Use `infra/Dockerfile.rust`.

Required environment variables:

```bash
DATABASE_URL=
REDIS_URL=
RUST_API_HOST=0.0.0.0
RUST_API_PORT=8080
JWT_SECRET=
JWT_EXPIRATION_HOURS=24
BCRYPT_COST=12
PYTHON_SERVICE_URL=https://your-python-ai-service.example.com
RATE_LIMIT_REQUESTS_PER_MINUTE=60
RATE_LIMIT_BURST=10
RUST_LOG=info
```

Expose the public Rust API URL. This becomes `NEXT_PUBLIC_API_URL` in Netlify.

### Python AI service

Use `infra/Dockerfile.python`.

Required environment variables:

```bash
DATABASE_URL=
REDIS_URL=
PYTHON_API_HOST=0.0.0.0
PYTHON_API_PORT=8000
RUST_API_URL=https://your-rust-api.example.com
LLM_PROVIDER=deepseek
LLM_API_KEY=
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_MODEL=deepseek-chat
LLM_MAX_TOKENS=4096
LLM_TIMEOUT_SECONDS=60
LLM_ENABLE_TOOLS=false
ANTHROPIC_API_KEY=
```

For DeepSeek, `LLM_ENABLE_TOOLS=false` is the currently validated setting.
Plain chat and task execution are validated with this configuration.

## 5. Netlify Frontend

The repository includes `netlify.toml`.

Set these Netlify environment variables:

```bash
NEXT_PUBLIC_API_URL=https://your-rust-api.example.com
NEXT_PUBLIC_PYTHON_API_URL=https://your-python-ai-service.example.com
```

Netlify settings:

- Base directory: `frontend`
- Build command: `npm run build`
- Publish directory: `.next`
- Node version: `20`

The Next.js plugin is declared in `netlify.toml`.

## 6. First Production User

After the backend and frontend are deployed:

1. Open the Netlify frontend URL.
2. Create a new workspace account from the registration screen.
3. Do not use local seed credentials in production.

## 7. Validation

Before switching DNS or sharing the app, validate:

```bash
curl https://your-rust-api.example.com/health
curl https://your-python-ai-service.example.com/health
```

Then use the frontend to:

1. Register a new account.
2. Create or inspect agents.
3. Start a conversation.
4. Send a message.
5. Confirm an assistant response is stored.

## 8. Security Before Public Launch

- Rotate any API key that was ever pasted into chat or terminal history.
- Generate a new long `JWT_SECRET`.
- Use production `BCRYPT_COST=12` or higher if your host can handle it.
- Restrict provider keys by account/project when possible.
- Use HTTPS public URLs only.
- Keep Supabase RLS/service policies under review before multi-tenant public use.
