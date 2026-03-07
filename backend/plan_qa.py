"""Plan Q&A: extract a clear goal from conversation or return a follow-up question."""

import json
from typing import Dict, List

try:
    from vla_service import client
except ImportError:
    client = None
from genai_retry import generate_content_with_retry
from model_config import MODEL_CHAT
from google.genai import types


def _topology_summary(topology: dict) -> str:
    """Build a short text summary of the room and entities for the LLM."""
    room = topology.get("node_name", "this room")
    lines = [f"Room: {room}", ""]
    anchors = topology.get("static_anchors", [])
    if anchors:
        lines.append("Static anchors (immovable):")
        for a in anchors:
            lines.append(f"  - {a.get('anchor_id', '')} ({a.get('type', '')}): {a.get('description', '')}")
        lines.append("")
    objects = topology.get("dynamic_objects", [])
    if objects:
        lines.append("Dynamic objects:")
        for o in objects:
            lines.append(f"  - {o.get('object_id', '')} ({o.get('type', '')}): {o.get('description', '')}")
    return "\n".join(lines)


def get_goal_or_question(
    history: List[Dict[str, str]],
    message: str,
    node_name: str,
    topology: dict,
) -> Dict[str, str]:
    """
    From conversation history + latest message, return either a clear goal or a follow-up question.

    Returns:
        Either {"goal": "<single sentence goal>"} or {"question": "<short question for the user>"}.
    """
    if not client:
        raise ValueError("GenAI client not initialized.")

    summary = _topology_summary(topology)

    system = """You are helping a user create a task plan for an embodied AI in a single room.
You have access to the room's topology (anchors and objects). Your job is to decide:

1. If the user has given enough information to form a clear, single-sentence task goal (e.g. "Clean the kitchen", "Make spaghetti"), output that goal.
2. If the goal is ambiguous or missing (e.g. user said "yes", "the kitchen", or something vague), output a short, helpful follow-up question to clarify what task they want to plan.

Output STRICT JSON only. Use exactly one of these shapes:
- To return a goal: {"goal": "single sentence describing the task"}
- To ask for clarification: {"question": "your short question here"}

Do not output both. Prefer returning a goal when the user's intent is clear; otherwise ask one concise question."""

    # Build conversation for context
    conv_lines = []
    for h in history:
        role = "User" if (h.get("role") == "user") else "Assistant"
        conv_lines.append(f"{role}: {h.get('text', '')}")
    conv_lines.append(f"User: {message}")

    user_content = f"""Room topology:
{summary}

Conversation so far:
{chr(10).join(conv_lines)}

Reply with JSON only: either {{"goal": "..."}} or {{"question": "..."}}."""

    response = generate_content_with_retry(
        client,
        model=MODEL_CHAT,
        contents=user_content,
        config=types.GenerateContentConfig(
            system_instruction=system,
            response_mime_type="application/json",
        ),
    )

    text = (response.text or "{}").strip()
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return {"question": "What task would you like me to plan?"}

    if isinstance(data, dict):
        if data.get("goal") and isinstance(data["goal"], str) and data["goal"].strip():
            return {"goal": data["goal"].strip()}
        if data.get("question") and isinstance(data["question"], str):
            return {"question": data["question"].strip()}
    return {"question": "What task would you like me to plan?"}
