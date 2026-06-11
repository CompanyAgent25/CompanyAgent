"""Tests for the orchestrator service."""
import json
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.services.orchestrator import Orchestrator


@pytest.fixture
def orchestrator():
    return Orchestrator()


@pytest.fixture
def mock_db():
    """Create a mock asyncpg pool."""
    pool = AsyncMock()
    return pool


@pytest.fixture
def sample_agent():
    return {
        "id": uuid4(),
        "team_id": uuid4(),
        "name": "Test Agent",
        "slug": "test-agent",
        "system_prompt": "You are a test agent.",
        "model": "claude-sonnet-4-20250514",
        "temperature": 0.7,
        "max_tokens": 4096,
        "execution_mode": "chat",
    }


@pytest.fixture
def sample_skill():
    return {
        "id": uuid4(),
        "name": "Test Skill",
        "slug": "test-skill",
        "description": "A test skill",
        "input_schema": {"type": "object", "properties": {"query": {"type": "string"}}},
        "output_schema": {},
        "handler_type": "python",
        "handler_config": {"module": "test", "function": "execute"},
        "is_active": True,
    }


class TestOrchestrator:
    @pytest.mark.asyncio
    async def test_run_chat_agent_not_found(self, orchestrator, mock_db):
        """When agent is not found, return an error message."""
        mock_db.fetchrow = AsyncMock(return_value=None)

        result = await orchestrator.run_chat(
            db_pool=mock_db,
            agent_id=uuid4(),
            conversation_id=uuid4(),
            user_message="hello",
        )

        assert "not found" in result["reply"].lower()

    @pytest.mark.asyncio
    async def test_run_chat_simple_response(self, orchestrator, mock_db, sample_agent):
        """Simple chat without tool use should return LLM response."""
        mock_db.fetchrow = AsyncMock(return_value=sample_agent)
        mock_db.fetch = AsyncMock(side_effect=[
            [],  # skills
            [],  # history
        ])

        with patch("app.services.orchestrator.llm_service") as mock_llm:
            mock_llm.chat = AsyncMock(return_value={
                "content": "Hello! How can I help?",
                "token_count": 50,
                "model": "claude-sonnet-4-20250514",
                "tool_calls": [],
                "stop_reason": "end_turn",
            })
            mock_llm.build_tools_from_skills = MagicMock(return_value=None)

            result = await orchestrator.run_chat(
                db_pool=mock_db,
                agent_id=sample_agent["id"],
                conversation_id=uuid4(),
                user_message="hello",
            )

        assert result["reply"] == "Hello! How can I help?"
        assert result["token_count"] == 50
        assert result["skills_used"] == []

    @pytest.mark.asyncio
    async def test_run_chat_with_tool_use(self, orchestrator, mock_db, sample_agent, sample_skill):
        """Chat with tool use should execute the skill and return final response."""
        mock_db.fetchrow = AsyncMock(return_value=sample_agent)
        mock_db.fetch = AsyncMock(side_effect=[
            [sample_skill],  # skills
            [],  # history
        ])

        call_count = 0

        async def mock_chat(**kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return {
                    "content": "",
                    "token_count": 30,
                    "model": "claude-sonnet-4-20250514",
                    "tool_calls": [{"id": "tc_1", "name": "test-skill", "input": {"query": "test"}}],
                    "stop_reason": "tool_use",
                }
            return {
                "content": "Based on the search results, here is the answer.",
                "token_count": 40,
                "model": "claude-sonnet-4-20250514",
                "tool_calls": [],
                "stop_reason": "end_turn",
            }

        with patch("app.services.orchestrator.llm_service") as mock_llm, \
             patch("app.services.orchestrator.skill_executor") as mock_executor:
            mock_llm.chat = mock_chat
            mock_llm.build_tools_from_skills = MagicMock(return_value=[{
                "name": "test-skill",
                "description": "A test skill",
                "input_schema": sample_skill["input_schema"],
            }])
            mock_executor.execute = AsyncMock(return_value={"result": "search result data", "success": True})

            result = await orchestrator.run_chat(
                db_pool=mock_db,
                agent_id=sample_agent["id"],
                conversation_id=uuid4(),
                user_message="search for something",
            )

        assert "answer" in result["reply"].lower()
        assert result["token_count"] == 70  # 30 + 40
        assert "test-skill" in result["skills_used"]

    @pytest.mark.asyncio
    async def test_execute_task_not_found(self, orchestrator, mock_db):
        """When task is not found, return error."""
        mock_db.fetchrow = AsyncMock(return_value=None)

        result = await orchestrator.execute_task(mock_db, uuid4())

        assert "error" in result

    @pytest.mark.asyncio
    async def test_execute_task_success(self, orchestrator, mock_db, sample_agent):
        """Successful task execution."""
        task = {
            "id": uuid4(),
            "agent_id": sample_agent["id"],
            "input": {"prompt": "Analyze this data"},
        }

        call_count = 0
        async def mock_fetchrow(query, *args):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return task
            return sample_agent

        mock_db.fetchrow = mock_fetchrow
        mock_db.fetch = AsyncMock(return_value=[])
        mock_db.execute = AsyncMock()

        with patch("app.services.orchestrator.llm_service") as mock_llm:
            mock_llm.chat = AsyncMock(return_value={
                "content": "Analysis complete.",
                "token_count": 100,
                "model": "claude-sonnet-4-20250514",
                "tool_calls": [],
                "stop_reason": "end_turn",
            })
            mock_llm.build_tools_from_skills = MagicMock(return_value=None)

            result = await orchestrator.execute_task(mock_db, task["id"])

        assert result["status"] == "completed"


class TestSkillExecutor:
    @pytest.mark.asyncio
    async def test_invalid_input_validation(self):
        """Skill executor should validate input against schema."""
        from app.services.skill_executor import SkillExecutor
        executor = SkillExecutor()

        skill = {
            "slug": "test",
            "handler_type": "python",
            "handler_config": {},
            "input_schema": {
                "type": "object",
                "properties": {"name": {"type": "string"}},
                "required": ["name"],
            },
        }

        result = await executor.execute(skill, {})  # Missing required field
        assert result["success"] is False
        assert "validation" in result["error"].lower()

    @pytest.mark.asyncio
    async def test_unknown_handler_type(self):
        """Unknown handler type should return error."""
        from app.services.skill_executor import SkillExecutor
        executor = SkillExecutor()

        skill = {
            "slug": "test",
            "handler_type": "unknown",
            "handler_config": {},
            "input_schema": {},
        }

        result = await executor.execute(skill, {})
        assert result["success"] is False
        assert "unknown" in result["error"].lower()
