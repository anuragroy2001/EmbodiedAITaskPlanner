"""Prompt templates for planner generation and repair."""


PLANNER_SYSTEM_PROMPT = """You are a task planner for an embodied AI system. Your job is to produce a grounded task DAG (directed acyclic graph) for a natural-language goal in a single room.

Rules:
- Generate ONLY tasks grounded in the observed topology. Use only the anchors and dynamic objects provided.
- Do NOT invent object IDs. Every object you reference must appear in the available entities list.
- Output STRICT JSON only. No markdown, no explanation outside the JSON.
- Make dependencies explicit: use "depends_on" to list task IDs that must complete before this task.
- Prefer necessary and concrete subtasks. Keep the DAG acyclic.
- Do NOT invent numeric map coordinates. Use "objects" to reference entity IDs; coordinates will be filled in separately. If you are uncertain about location, omit numeric fields or leave location empty.
- Each subtask must have: id (unique string like "t1", "t2"), action, description, objects (array of entity IDs), depends_on (array of task IDs), and optionally preconditions, success_criteria, duration_estimate_sec.
- The dependency_graph must have "nodes" (list of all task IDs) and "edges" (list of {"source": "task_id", "target": "task_id"} where source depends on target).
"""


def build_planner_user_prompt(goal: str, grounded_context: dict, node_name: str) -> str:
    """Build user prompt with room, entities, and schema request."""
    room = grounded_context.get("room", node_name)
    entities = grounded_context.get("entities", {})
    anchors = [e for e in entities.values() if e.get("kind") == "anchor"]
    objects = [e for e in entities.values() if e.get("kind") == "object"]

    lines = [
        f"Room: {room}",
        "",
        "Available static anchors (immovable):",
    ]
    for a in anchors:
        loc_status = "has map coordinates" if a.get("map_center") else "no map coordinates"
        lines.append(f"  - {a['id']} ({a.get('type', '')}): {a.get('description', '')} [{loc_status}]")
    lines.append("")
    lines.append("Available dynamic objects:")
    for o in objects:
        loc_status = "has map coordinates" if o.get("map_center") else "no map coordinates"
        lines.append(f"  - {o['id']} ({o.get('type', '')}): {o.get('description', '')} [{loc_status}]")
    lines.append("")
    lines.append(f"Goal: {goal}")
    lines.append("")
    lines.append("""Return a single JSON object with this exact shape (no other keys at top level):
{
  "task_id": "unique_id_for_this_plan",
  "goal": "<same goal string>",
  "room": "<room name>",
  "subtasks": [
    {
      "id": "t1",
      "action": "<verb>",
      "description": "<short description>",
      "objects": ["<entity_id>"],
      "location": null,
      "duration_estimate_sec": <number or null>,
      "depends_on": [],
      "preconditions": [],
      "success_criteria": []
    }
  ],
  "dependency_graph": {
    "nodes": ["t1", "t2", ...],
    "edges": [{"source": "t2", "target": "t1"}, ...]
  },
  "warnings": []
}

Important: Only reference object/anchor IDs that appear in the lists above. Edges: "source" depends on "target" (target must complete before source).""")
    return "\n".join(lines)


def build_repair_prompt(
    original_output: str,
    validation_errors: list,
    grounded_context: dict,
    goal: str,
    node_name: str,
) -> str:
    """Build prompt for one repair attempt when validation fails."""
    room = grounded_context.get("room", node_name)
    entity_ids = list(grounded_context.get("entities", {}).keys())
    return f"""The previous planner output failed validation. Fix it and return valid JSON only.

Room: {room}
Valid entity IDs (use only these in "objects"): {entity_ids}
Goal: {goal}

Validation errors:
{chr(10).join(validation_errors)}

Previous output (fix and return corrected JSON):
{original_output}

Return the corrected JSON object with the same schema: task_id, goal, room, subtasks, dependency_graph, warnings. Ensure no cycles, all object IDs from the list above, all depends_on and graph edges reference existing task IDs."""
