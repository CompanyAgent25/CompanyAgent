import structlog
from contextlib import asynccontextmanager

import asyncpg
import redis.asyncio as aioredis
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.routes import router as api_router

log = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Convert postgres:// to postgresql:// for asyncpg
    db_url = settings.database_url.replace("postgres://", "postgresql://")
    app.state.db = await asyncpg.create_pool(db_url, min_size=5, max_size=20)
    app.state.redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    log.info("Python services started", port=settings.port)
    yield
    await app.state.db.close()
    await app.state.redis.close()
    log.info("Python services stopped")


app = FastAPI(
    title="CompanyAgent AI Services",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "python-ai"}
