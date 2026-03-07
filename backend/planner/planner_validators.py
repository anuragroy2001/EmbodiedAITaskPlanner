"""Deterministic validation for planner output (DAG, object refs, coordinates)."""

from typing import List

import networkx as nx

from .planner_schemas import PlannerOutput, Subtask, ValidationResult


def validate_known_objects(subtasks: List[Subtask], grounded_context: dict) -> List[str]:
    """Reject if any subtask references an object ID not in topology."""
    errors: List[str] = []
    known = set(grounded_context.get("entities", {}).keys())
    for st in subtasks:
        for oid in st.objects or []:
            if oid and oid not in known:
                errors.append(f"Subtask '{st.id}' references unknown object '{oid}'")
    return errors


def validate_dependency_references(subtasks: List[Subtask]) -> List[str]:
    """Reject if depends_on contains unknown task IDs."""
    errors: List[str] = []
    task_ids = {st.id for st in subtasks}
    for st in subtasks:
        for dep in st.depends_on or []:
            if dep and dep not in task_ids:
                errors.append(f"Subtask '{st.id}' depends on unknown task '{dep}'")
    return errors


def validate_duplicate_task_ids(subtasks: List[Subtask]) -> List[str]:
    """Reject duplicate subtask IDs."""
    errors: List[str] = []
    seen: set = set()
    for st in subtasks:
        if st.id in seen:
            errors.append(f"Duplicate subtask id '{st.id}'")
        seen.add(st.id)
    return errors


def validate_cycle_free(subtasks: List[Subtask]) -> List[str]:
    """Use networkx to detect cycles in dependency graph."""
    errors: List[str] = []
    G = nx.DiGraph()
    for st in subtasks:
        G.add_node(st.id)
    for st in subtasks:
        for dep in st.depends_on or []:
            if dep:
                G.add_edge(st.id, dep)
    try:
        cycle = list(nx.find_cycle(G))
        if cycle:
            errors.append(f"Dependency cycle detected: {cycle}")
    except nx.NetworkXNoCycle:
        pass
    return errors


def validate_dependency_graph_matches_subtasks(
    subtasks: List[Subtask], dependency_graph: dict
) -> List[str]:
    """Ensure graph nodes match subtask IDs and edges reference valid IDs."""
    errors: List[str] = []
    task_ids = {st.id for st in subtasks}
    nodes = set(dependency_graph.get("nodes", []))
    edges = dependency_graph.get("edges", [])

    if nodes != task_ids:
        missing = task_ids - nodes
        extra = nodes - task_ids
        if missing:
            errors.append(f"Dependency graph missing nodes: {missing}")
        if extra:
            errors.append(f"Dependency graph has extra nodes: {extra}")

    for e in edges:
        src = e.get("source")
        tgt = e.get("target")
        if src and src not in task_ids:
            errors.append(f"Edge references unknown source task '{src}'")
        if tgt and tgt not in task_ids:
            errors.append(f"Edge references unknown target task '{tgt}'")

    return errors


def validate_task_locations(subtasks: List[Subtask]) -> List[str]:
    """If location is set, require 0 <= x,y <= 100."""
    errors: List[str] = []
    for st in subtasks:
        loc = st.location
        if loc is None:
            continue
        if not (0 <= loc.x <= 100):
            errors.append(f"Subtask '{st.id}' location x={loc.x} out of range [0, 100]")
        if not (0 <= loc.y <= 100):
            errors.append(f"Subtask '{st.id}' location y={loc.y} out of range [0, 100]")
    return errors


def validate_planner_output(
    planner_output: PlannerOutput, grounded_context: dict
) -> ValidationResult:
    """Run all checks and return ValidationResult."""
    all_errors: List[str] = []
    all_warnings: List[str] = []

    all_errors.extend(validate_duplicate_task_ids(planner_output.subtasks))
    all_errors.extend(validate_dependency_references(planner_output.subtasks))
    all_errors.extend(validate_known_objects(planner_output.subtasks, grounded_context))
    all_errors.extend(validate_cycle_free(planner_output.subtasks))
    all_errors.extend(
        validate_dependency_graph_matches_subtasks(
            planner_output.subtasks, planner_output.dependency_graph.model_dump()
        )
    )
    all_errors.extend(validate_task_locations(planner_output.subtasks))

    return ValidationResult(
        valid=len(all_errors) == 0,
        errors=all_errors,
        warnings=all_warnings,
    )
