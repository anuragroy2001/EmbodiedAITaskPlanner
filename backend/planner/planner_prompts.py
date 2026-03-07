"""Prompt templates for planner generation and repair."""

# Shared rules for all robot types (JSON/DAG format and grounding).
_SHARED_PLANNER_RULES = """
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

# Humanoid: most capable; no extra restrictions beyond shared rules.
PLANNER_SYSTEM_PROMPT_HUMANOID = """You are a task planner for an embodied AI system controlling a HUMANOID robot. Your job is to produce a grounded task DAG (directed acyclic graph) for a natural-language goal in a single room.

Robot type: Humanoid.
Capabilities: This robot can move freely, pick up and manipulate objects (grab, place, carry), and access high spaces (shelves, countertops, tables). It has arms and upright posture, so it can reach objects at various heights and work in tight spaces when needed. You may plan any task that is grounded in the observed environment.
Restrictions: None beyond the rules below. Plan subtasks that involve navigation, manipulation, reaching high or low, and multi-step object interactions as needed for the goal.
""" + _SHARED_PLANNER_RULES

# Quadruped: low reach only, navigation-focused.
PLANNER_SYSTEM_PROMPT_QUADRUPED = """You are a task planner for an embodied AI system controlling a QUADRUPED robot. Your job is to produce a grounded task DAG (directed acyclic graph) for a natural-language goal in a single room.

Robot type: Quadruped.
Capabilities: This robot can navigate through the environment, move between locations, and perform tasks that require only LOW reach—objects and surfaces at or near floor level, or within a low vertical range (e.g., items on the floor, low furniture). It is well-suited for navigation, patrolling, and low-height inspection or delivery.
Restrictions: Do NOT plan subtasks that require reaching high spaces (shelves, high cabinets, countertops, tables above low height). Do NOT plan grasping, grabbing, or manipulating objects that are not at low level. Do NOT include actions that assume arms or upright human-like reach. If the goal inherently requires high reach or manipulation, only plan the parts the quadruped can do (e.g., navigation to a zone, low-level tasks) and omit or warn about impossible parts.
""" + _SHARED_PLANNER_RULES

# Mobile base: floor cleaning, sweeping; avoid narrow spaces and high reach.
PLANNER_SYSTEM_PROMPT_MOBILE_BASE = """You are a task planner for an embodied AI system controlling a MOBILE BASE robot (e.g., floor cleaner, sweeper). Your job is to produce a grounded task DAG (directed acyclic graph) for a natural-language goal in a single room.

Robot type: Mobile base.
Capabilities: This robot is good for floor cleaning, sweeping, and open-area navigation. It operates on the floor and can move across open spaces. It can perform floor-level tasks and traverse rooms with moderate clearance.
Restrictions: Do NOT plan subtasks that require reaching high OR medium height (no shelves, counters, tables, or elevated surfaces). Do NOT plan tasks in tight or narrow spaces where the robot cannot maneuver. Do NOT plan complex manipulation or grasping. Prefer navigation and floor-level actions only (e.g., go to area, clean/sweep floor, avoid obstacles). If the goal requires high reach or tight spaces, only plan the feasible parts and add warnings for the rest.
""" + _SHARED_PLANNER_RULES

# Backward compatibility: default to humanoid.
PLANNER_SYSTEM_PROMPT = PLANNER_SYSTEM_PROMPT_HUMANOID


def get_system_prompt_for_robot(robot_type: str) -> str:
    """Return the system prompt for the given robot type. Normalizes to lowercase; unknown values fall back to humanoid."""
    key = (robot_type or "humanoid").strip().lower()
    if key == "quadruped":
        return PLANNER_SYSTEM_PROMPT_QUADRUPED
    if key == "mobile_base" or key == "mobile base":
        return PLANNER_SYSTEM_PROMPT_MOBILE_BASE
    return PLANNER_SYSTEM_PROMPT_HUMANOID


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
