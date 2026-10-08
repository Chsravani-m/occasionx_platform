"""
Tests for the AI proposal feature.

These are fully mocked - no real OpenAI API calls are made, so
running this suite never costs money and never needs a working key
or billing set up. Real end-to-end checking (does the prompt/model
actually produce good text) is still best done manually via
http://localhost:8007/docs once in a while, not in this suite.

Run from inside services/ai-service/:

    pip install -r requirements.txt -r requirements-dev.txt
    pytest
"""

from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app
from app.schemas.ai_proposal import AIProposalRequest
from app.services.ai_proposal import AIProposalService, FALLBACK_MESSAGE

client = TestClient(app)

SAMPLE_PAYLOAD = {
    "event_type_name": "Wedding",
    "package_name": "Premium Wedding Package",
    "budget": 500000,
    "guest_count": 150,
    "estimated_cost": 486000,
    "breakdown": [
        {"category": "Venue", "cost": 200000},
        {"category": "Catering", "cost": 150000},
        {"category": "Decoration", "cost": 136000},
    ],
    "location_label": "Hyderabad, Telangana",
    "event_date": "2026-12-10",
}


def make_request_object() -> AIProposalRequest:
    return AIProposalRequest(**SAMPLE_PAYLOAD)


def fake_openai_response(text: str):
    """Minimal stand-in for what client.chat.completions.create() returns."""
    message = MagicMock()
    message.content = text

    choice = MagicMock()
    choice.message = message

    response = MagicMock()
    response.choices = [choice]

    return response


class TestAIProposalService:
    """Unit tests for the service layer, no FastAPI/HTTP involved."""

    def test_no_api_key_returns_fallback(self, monkeypatch):
        monkeypatch.delenv("OPENAI_API_KEY", raising=False)

        available, proposal = AIProposalService.generate_proposal(
            make_request_object()
        )

        assert available is False
        assert proposal == FALLBACK_MESSAGE

    def test_successful_call_returns_generated_text(self, monkeypatch):
        monkeypatch.setenv("OPENAI_API_KEY", "test-key-not-real")

        fake_client = MagicMock()
        fake_client.chat.completions.create.return_value = fake_openai_response(
            "This package fits your budget nicely."
        )

        with patch.object(AIProposalService, "_client", return_value=fake_client):
            available, proposal = AIProposalService.generate_proposal(
                make_request_object()
            )

        assert available is True
        assert proposal == "This package fits your budget nicely."
        fake_client.chat.completions.create.assert_called_once()

    def test_empty_response_falls_back(self, monkeypatch):
        monkeypatch.setenv("OPENAI_API_KEY", "test-key-not-real")

        fake_client = MagicMock()
        fake_client.chat.completions.create.return_value = fake_openai_response("")

        with patch.object(AIProposalService, "_client", return_value=fake_client):
            available, proposal = AIProposalService.generate_proposal(
                make_request_object()
            )

        assert available is False
        assert proposal == FALLBACK_MESSAGE

    def test_api_error_is_caught_gracefully(self, monkeypatch):
        # Simulates exactly what happened with the real account earlier:
        # insufficient_quota / any other API failure should never crash
        # the request, just degrade to a readable error message.
        monkeypatch.setenv("OPENAI_API_KEY", "test-key-not-real")

        fake_client = MagicMock()
        fake_client.chat.completions.create.side_effect = Exception(
            "insufficient_quota"
        )

        with patch.object(AIProposalService, "_client", return_value=fake_client):
            available, proposal = AIProposalService.generate_proposal(
                make_request_object()
            )

        assert available is False
        assert "Couldn't generate an AI proposal" in proposal
        assert "insufficient_quota" in proposal


class TestAIProposalEndpoint:
    """Tests the actual POST /ai/proposal route via FastAPI's TestClient."""

    def test_endpoint_shape_when_not_configured(self, monkeypatch):
        monkeypatch.delenv("OPENAI_API_KEY", raising=False)

        response = client.post("/ai/proposal", json=SAMPLE_PAYLOAD)

        assert response.status_code == 200

        body = response.json()
        assert body["available"] is False
        assert body["proposal"] == FALLBACK_MESSAGE

    def test_endpoint_shape_with_mocked_ai(self, monkeypatch):
        monkeypatch.setenv("OPENAI_API_KEY", "test-key-not-real")

        fake_client = MagicMock()
        fake_client.chat.completions.create.return_value = fake_openai_response(
            "Great fit for your guest count and budget."
        )

        with patch.object(AIProposalService, "_client", return_value=fake_client):
            response = client.post("/ai/proposal", json=SAMPLE_PAYLOAD)

        assert response.status_code == 200

        body = response.json()
        assert body["available"] is True
        assert body["proposal"] == "Great fit for your guest count and budget."

    def test_endpoint_rejects_missing_required_fields(self):
        response = client.post("/ai/proposal", json={"package_name": "X"})

        assert response.status_code == 422
