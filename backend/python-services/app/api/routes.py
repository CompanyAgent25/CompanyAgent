from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from app.models.schemas import (
    ChatRequest,
    ChatResponse,
    ExecuteTaskRequest,
    McpDiscoverRequest,
    McpHealthCheckRequest,
    TaskResult,
)
from app.services.mcp_manager import mcp_manager
from app.services.orchestrator import orchestrator

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(request: Request, body: ChatRequest):
    """Process a chat message through an agent.

    Called by the Rust API when a user sends a message.
    Handles the full LLM interaction loop including tool use.
    """
    db = request.app.state.db

    result = await orchestrator.run_chat(
        db_pool=db,
        agent_id=body.agent_id,
        conversation_id=body.conversation_id,
        user_message=body.message,
    )

    return ChatResponse(
        reply=result["reply"],
        token_count=result.get("token_count"),
        model=result.get("model"),
        skills_used=result.get("skills_used", []),
    )


@router.post("/execute-task", response_model=TaskResult)
async def execute_task(request: Request, body: ExecuteTaskRequest):
    """Execute a standalone task.

    Called by the Rust API when a task is created.
    Runs the agent autonomously and updates task status in DB.
    """
    db = request.app.state.db

    result = await orchestrator.execute_task(db_pool=db, task_id=body.task_id)

    return TaskResult(
        task_id=body.task_id,
        status=result.get("status", "failed"),
        output=result.get("output"),
        error=result.get("error"),
    )


@router.post("/mcp/health-check")
async def mcp_health_check(body: McpHealthCheckRequest):
    """Check health of an MCP server.

    For stdio: attempts to start the process and send an initialize request.
    For SSE: attempts to connect to the URL.
    """
    try:
        if body.transport == "stdio" and body.command:
            conn = await mcp_manager.connect_stdio(
                server_id=body.server_id,
                command=body.command,
                args=body.args,
            )
            healthy = await mcp_manager.health_check(body.server_id)
            return {"status": "healthy" if healthy else "unhealthy"}
        elif body.transport == "sse" and body.url:
            import httpx
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(body.url)
                return {"status": "healthy" if resp.status_code < 400 else "unhealthy"}
        else:
            return JSONResponse(
                status_code=400,
                content={"error": "Invalid transport configuration"},
            )
    except Exception as e:
        return JSONResponse(
            status_code=200,
            content={"status": "unhealthy", "error": str(e)},
        )


@router.post("/mcp/discover")
async def mcp_discover(body: McpDiscoverRequest):
    """Discover tools and resources from an MCP server."""
    try:
        if body.transport == "stdio" and body.command:
            await mcp_manager.connect_stdio(
                server_id=body.server_id,
                command=body.command,
                args=body.args,
            )

        tools = await mcp_manager.list_tools(body.server_id)
        resources = await mcp_manager.list_resources(body.server_id)

        return {"tools": tools, "resources": resources}
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Discovery failed: {str(e)}"},
        )
