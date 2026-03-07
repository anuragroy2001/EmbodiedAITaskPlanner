"""Task DAG planner: generates grounded subtask DAG from topology and goal."""

import json
import os
import uuid

from .planner_schemas import (
    PlannerOutput,
    PlannerTrace,
    Subtask,
    TaskLocation,
    DependencyGraph,
)
from .planner_normalization import build_grounded_context, choose_location_for_objects
from .planner_validators import validate_planner_output
from .planner_prompts import (
    PLANNER_SYSTEM_PROMPT,
    build_planner_user_prompt,
    build_repair_prompt,
)

# Use same Gemini client as VLA
try:
    from vla_service import client
except ImportError:
    client = None
from genai_retry import generate_content_with_retry
from model_config import MODEL_PLANNER
from google.genai import types  # type: ignore[import-untyped]


def _mock_data_dir() -> str:
    return os.path.join(os.path.dirname(__file__), "planner_mock_data")


def load_mock_planner_output(goal: str) -> dict:
    """Load mock JSON by goal keywords. Default: clean_kitchen."""
    goal_lower = (goal or "").lower()
    if "spaghetti" in goal_lower or ("cook" in goal_lower and "sauce" in goal_lower):
        filename = "cook_spaghetti_planner_output.json"
    else:
        filename = "clean_kitchen_planner_output.json"
    path = os.path.join(_mock_data_dir(), filename)
    if not os.path.isfile(path):
        raise FileNotFoundError(f"Mock planner data not found: {path}")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def call_planner_model(prompt: str) -> dict:
    """Call Gemini with planner system prompt; return parsed JSON dict."""
    if not client:
        raise ValueError("GenAI client not initialized.")
    response = generate_content_with_retry(
        client,
        model=MODEL_PLANNER,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=PLANNER_SYSTEM_PROMPT,
            response_mime_type="application/json",
        ),
    )
    text = response.text or "{}"
    if isinstance(text, dict):
        return text
    data = json.loads(text)
    if isinstance(data, list) and data:
        return data[0] if isinstance(data[0], dict) else {"subtasks": [], "dependency_graph": {"nodes": [], "edges": []}}
    if isinstance(data, dict):
        print(f"[planner] call_planner_model response: task_id={data.get('task_id')}, subtasks={len(data.get('subtasks', []))}")
    return data if isinstance(data, dict) else {"subtasks": [], "dependency_graph": {"nodes": [], "edges": []}}


def call_planner_repair_model(
    original_output: str,
    validation_errors: list,
    grounded_context: dict,
    goal: str,
    node_name: str,
) -> dict:
    """One repair attempt: build repair prompt, call Gemini, return parsed dict."""
    if not client:
        raise ValueError("GenAI client not initialized.")
    repair_prompt = build_repair_prompt(
        original_output, validation_errors, grounded_context, goal, node_name
    )
    response = generate_content_with_retry(
        client,
        model=MODEL_PLANNER,
        contents=repair_prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
        ),
    )
    text = response.text or "{}"
    data = json.loads(text) if isinstance(text, str) else text
    if isinstance(data, list) and data:
        return data[0] if isinstance(data[0], dict) else {}
    return data if isinstance(data, dict) else {}


def _ensure_task_id(data: dict, node_name: str) -> str:
    if data.get("task_id"):
        return data["task_id"]
    return f"task_{node_name}_{uuid.uuid4().hex[:8]}"


def _dict_to_subtask(d: dict) -> Subtask:
    loc = d.get("location")
    if isinstance(loc, dict) and (loc.get("x") is not None or loc.get("y") is not None):
        location = TaskLocation(
            x=float(loc.get("x", 0)),
            y=float(loc.get("y", 0)),
            label=loc.get("label"),
        )
    else:
        location = None
    return Subtask(
        id=str(d.get("id", "")),
        action=str(d.get("action", "")),
        description=str(d.get("description", "")),
        objects=list(d.get("objects", [])) if isinstance(d.get("objects"), list) else [],
        location=location,
        duration_estimate_sec=d.get("duration_estimate_sec"),
        depends_on=list(d.get("depends_on", [])) if isinstance(d.get("depends_on"), list) else [],
        preconditions=list(d.get("preconditions", [])) if isinstance(d.get("preconditions"), list) else [],
        success_criteria=list(d.get("success_criteria", [])) if isinstance(d.get("success_criteria"), list) else [],
    )


def parse_planner_output(raw_output: dict | str, goal: str, node_name: str) -> PlannerOutput:
    """Convert raw model or mock dict into PlannerOutput."""
    if isinstance(raw_output, str):
        raw_output = json.loads(raw_output) if raw_output.strip() else {}
    if not isinstance(raw_output, dict):
        raw_output = {}
    task_id = _ensure_task_id(raw_output, node_name)
    room = raw_output.get("room") or node_name
    subtasks_data = raw_output.get("subtasks", [])
    if not isinstance(subtasks_data, list):
        subtasks_data = []
    subtasks = [_dict_to_subtask(s) for s in subtasks_data]
    dg = raw_output.get("dependency_graph", {})
    if not isinstance(dg, dict):
        dg = {}
    dependency_graph = DependencyGraph(
        nodes=list(dg.get("nodes", [])) or [st.id for st in subtasks],
        edges=list(dg.get("edges", [])),
    )
    warnings = list(raw_output.get("warnings", [])) if isinstance(raw_output.get("warnings"), list) else []
    return PlannerOutput(
        task_id=task_id,
        goal=goal or raw_output.get("goal", ""),
        room=room,
        subtasks=subtasks,
        dependency_graph=dependency_graph,
        warnings=warnings,
        planner_trace=None,
    )


def apply_deterministic_grounding(
    planner_output: PlannerOutput, grounded_context: dict
) -> PlannerOutput:
    """Fill task locations from grounded entity centers; add warnings when missing."""
    for st in planner_output.subtasks:
        if st.objects and (st.location is None or (st.location.x == 0 and st.location.y == 0 and not st.location.label)):
            loc = choose_location_for_objects(st.objects, grounded_context)
            if loc is not None:
                st.location = loc
            else:
                planner_output.warnings.append(
                    f"Subtask '{st.id}' references objects with no map coordinates: {st.objects}"
                )
    return planner_output


def generate_task_dag(topology, locations, goal, node_name, use_mock=False) -> PlannerOutput:
    """Generate a grounded task DAG for the goal using topology and locations."""
    print(f"[planner] generate_task_dag: goal={goal!r}, node_name={node_name!r}, use_mock={use_mock}, locations_count={len(locations) if locations else 0}")
    grounded_context = build_grounded_context(topology, locations)
    context_keys = list(grounded_context.keys()) if isinstance(grounded_context, dict) else "?"
    print(f"[planner] Grounded context keys: {context_keys}")
    prompt_context = build_planner_user_prompt(goal, grounded_context, node_name)
    print(f"[planner] User prompt length: {len(prompt_context)} chars")

    if use_mock:
        print("[planner] Using mock planner output")
        raw_output = load_mock_planner_output(goal)
        model_name = "mock"
    else:
        print(f"[planner] Calling planner model ({MODEL_PLANNER})...")
        raw_output = call_planner_model(prompt_context)
        model_name = MODEL_PLANNER

    raw_subtasks = raw_output.get("subtasks", []) if isinstance(raw_output, dict) else []
    print(f"[planner] Raw output: {len(raw_subtasks)} subtasks, task_id={raw_output.get('task_id', 'N/A') if isinstance(raw_output, dict) else 'N/A'}")

    planner_output = parse_planner_output(raw_output, goal, node_name)
    print(f"[planner] Parsed: task_id={planner_output.task_id!r}, subtasks={len(planner_output.subtasks)}")
    planner_output = apply_deterministic_grounding(planner_output, grounded_context)
    validation = validate_planner_output(planner_output, grounded_context)
    print(f"[planner] Validation: valid={validation.valid}, errors={len(validation.errors)}, warnings={len(validation.warnings)}")
    if validation.errors:
        for err in validation.errors:
            print(f"[planner]   - {err}")

    if not validation.valid and not use_mock:
        print("[planner] Validation failed, attempting repair...")
        repaired_raw = call_planner_repair_model(
            json.dumps(raw_output),
            validation.errors,
            grounded_context,
            goal,
            node_name,
        )
        planner_output = parse_planner_output(repaired_raw, goal, node_name)
        planner_output = apply_deterministic_grounding(planner_output, grounded_context)
        validation = validate_planner_output(planner_output, grounded_context)
        print(f"[planner] After repair: valid={validation.valid}, errors={len(validation.errors)}")

    planner_output.warnings.extend(validation.warnings)
    planner_output.planner_trace = PlannerTrace(
        mode="mock" if use_mock else "live",
        model=model_name,
        validation_passed=validation.valid,
        errors=validation.errors,
    )
    print(f"[planner] Returning PlannerOutput: task_id={planner_output.task_id!r}, subtasks={len(planner_output.subtasks)}, validation_passed={validation.valid}")
    return planner_output
