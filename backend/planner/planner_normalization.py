"""Normalize topology and locations into a grounded planner context."""

from typing import Dict, List, Optional

from .planner_schemas import TaskLocation


def normalize_topology(topology: dict) -> dict:
    """Merge static_anchors and dynamic_objects into one normalized entities lookup.
    Preserves type, description, image_indices; standardizes IDs.
    """
    room = topology.get("node_name", "")
    entities: Dict[str, dict] = {}

    for a in topology.get("static_anchors", []):
        eid = a.get("anchor_id", "")
        if not eid:
            continue
        entities[eid] = {
            "id": eid,
            "kind": "anchor",
            "type": a.get("type", ""),
            "description": a.get("description", ""),
            "image_indices": list(a.get("image_indices", [])),
        }

    for d in topology.get("dynamic_objects", []):
        eid = d.get("object_id", "")
        if not eid:
            continue
        entities[eid] = {
            "id": eid,
            "kind": "object",
            "type": d.get("type", ""),
            "description": d.get("description", ""),
            "image_indices": list(d.get("image_indices", [])),
        }

    return {
        "room": room,
        "entities": entities,
        "navigable_edges": list(topology.get("navigable_edges", [])),
    }


def normalize_locations(locations: list) -> dict:
    """Convert localization array into object_id -> box mapping with center."""
    result: Dict[str, dict] = {}
    for loc in locations or []:
        oid = loc.get("object_id") or loc.get("id", "")
        if not oid:
            continue
        xmin = float(loc.get("xmin", 0))
        ymin = float(loc.get("ymin", 0))
        xmax = float(loc.get("xmax", 0))
        ymax = float(loc.get("ymax", 0))
        result[oid] = {
            "xmin": xmin,
            "ymin": ymin,
            "xmax": xmax,
            "ymax": ymax,
            "center_x": (xmin + xmax) / 2,
            "center_y": (ymin + ymax) / 2,
        }
    return result


def build_grounded_context(topology: dict, locations: list) -> dict:
    """Merge normalized topology and locations; attach map coordinates where available."""
    norm_top = normalize_topology(topology)
    norm_locs = normalize_locations(locations)
    entities = norm_top["entities"]

    for eid, ent in list(entities.items()):
        ent = dict(ent)
        if eid in norm_locs:
            box = norm_locs[eid]
            ent["map_bbox"] = {
                "xmin": box["xmin"],
                "ymin": box["ymin"],
                "xmax": box["xmax"],
                "ymax": box["ymax"],
            }
            ent["map_center"] = {"x": box["center_x"], "y": box["center_y"]}
        else:
            ent["map_bbox"] = None
            ent["map_center"] = None
        entities[eid] = ent

    return {
        "room": norm_top["room"],
        "entities": entities,
        "navigable_edges": norm_top["navigable_edges"],
    }


def choose_location_for_objects(
    object_ids: list, grounded_context: dict
) -> Optional[TaskLocation]:
    """Return a single TaskLocation for the given object IDs.
    - One object with map_center -> use that center.
    - Multiple with map_center -> centroid.
    - None -> return None.
    """
    entities = grounded_context.get("entities", {})
    centers: List[tuple] = []
    labels: List[str] = []

    for oid in object_ids or []:
        ent = entities.get(oid)
        if not ent:
            continue
        center = ent.get("map_center")
        if center is not None and "x" in center and "y" in center:
            centers.append((float(center["x"]), float(center["y"])))
            labels.append(ent.get("id", oid))

    if not centers:
        return None
    if len(centers) == 1:
        return TaskLocation(x=centers[0][0], y=centers[0][1], label=labels[0] if labels else None)
    cx = sum(c[0] for c in centers) / len(centers)
    cy = sum(c[1] for c in centers) / len(centers)
    label = labels[0] if len(labels) == 1 else ",".join(labels[:3])
    return TaskLocation(x=cx, y=cy, label=label)
