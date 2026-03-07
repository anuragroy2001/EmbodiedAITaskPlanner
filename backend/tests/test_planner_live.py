#!/usr/bin/env python3
"""
Test the task planner with live Gemini (no server, no frontend).

Run from the backend directory so imports resolve:
  cd backend && .venv/bin/python tests/test_planner_live.py

Requires GOOGLE_API_KEY in .env (or environment). Uses sample topology and
locations so no image upload is needed.
"""

import os
import sys

from dotenv import load_dotenv

# Ensure we're in backend so vla_service and planner resolve
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR) if os.path.basename(SCRIPT_DIR) == "tests" else SCRIPT_DIR
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)
os.chdir(BACKEND_DIR)

# Load .env from backend directory
_env_path = os.path.join(BACKEND_DIR, ".env")
if os.path.isfile(_env_path):
    load_dotenv(_env_path)
else:
    load_dotenv()

def main():
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key or api_key.strip() == "your_api_key_here":
        print("ERROR: Set GOOGLE_API_KEY in backend/.env (get one at https://aistudio.google.com/apikey)")
        sys.exit(1)

    from planner import generate_task_dag

    # Sample topology (same shape as VLAService.extract_topology)
    topology = {
        "node_name": "kitchen_main",
        "static_anchors": [
            {
                "anchor_id": "stove_1",
                "type": "stove",
                "description": "4-burner gas stove with oven below",
                "image_indices": [2, 3]
            },
            {
                "anchor_id": "sink_1",
                "type": "sink",
                "description": "double basin stainless steel sink with faucet",
                "image_indices": [0, 1]
            },
            {
                "anchor_id": "counter_north",
                "type": "counter",
                "description": "granite countertop along north wall",
                "image_indices": [0, 1]
            },
            {
                "anchor_id": "counter_east",
                "type": "counter",
                "description": "granite countertop along east wall near stove",
                "image_indices": [2]
            },
            {
                "anchor_id": "refrigerator_1",
                "type": "refrigerator",
                "description": "stainless steel french door refrigerator",
                "image_indices": [4, 5]
            },
            {
                "anchor_id": "dishwasher_1",
                "type": "dishwasher",
                "description": "built-in dishwasher next to sink",
                "image_indices": [1]
            },
            {
                "anchor_id": "cabinet_upper_1",
                "type": "cabinet",
                "description": "upper cabinets above north counter",
                "image_indices": [0, 1]
            }
        ],
        "dynamic_objects": [
            {
                "object_id": "pot_1",
                "type": "pot",
                "description": "large stock pot on stove",
                "image_indices": [2]
            },
            {
                "object_id": "cutting_board_1",
                "type": "cutting_board",
                "description": "wooden cutting board on north counter",
                "image_indices": [0]
            },
            {
                "object_id": "knife_block_1",
                "type": "knife_block",
                "description": "wooden knife block on north counter",
                "image_indices": [0]
            },
            {
                "object_id": "plate_stack",
                "type": "plates",
                "description": "stack of dirty plates on east counter",
                "image_indices": [2, 3]
            },
            {
                "object_id": "mug_1",
                "type": "mug",
                "description": "coffee mug near sink",
                "image_indices": [1]
            },
            {
                "object_id": "sponge_1",
                "type": "sponge",
                "description": "dish sponge next to sink",
                "image_indices": [1]
            },
            {
                "object_id": "trash_can_1",
                "type": "trash_can",
                "description": "pull-out trash can under counter",
                "image_indices": [5, 6]
            },
            {
                "object_id": "spray_bottle_1",
                "type": "cleaning_spray",
                "description": "counter cleaning spray under sink",
                "image_indices": [1]
            }
        ],
        "navigable_edges": [
            {
                "edge_id": "edge_to_dining",
                "description": "open archway leading to dining room",
                "visual_cue": "wide opening to the south"
            },
            {
                "edge_id": "edge_to_pantry",
                "description": "door to pantry closet",
                "visual_cue": "closed door on west wall"
            }
        ]
    }

    # Sample locations (same shape as VLAService.locate_objects_in_map; 0-100 coords)
    locations = [
        {"object_id": "stove_1", "ymin": 45, "xmin": 20, "ymax": 65, "xmax": 42},
        {"object_id": "sink_1", "ymin": 12, "xmin": 48, "ymax": 32, "xmax": 72},
        {"object_id": "counter_north", "ymin": 8, "xmin": 15, "ymax": 25, "xmax": 85},
        {"object_id": "counter_east", "ymin": 25, "xmin": 75, "ymax": 55, "xmax": 92},
        {"object_id": "refrigerator_1", "ymin": 60, "xmin": 5, "ymax": 95, "xmax": 22},
        {"object_id": "dishwasher_1", "ymin": 15, "xmin": 72, "ymax": 35, "xmax": 88},
        {"object_id": "pot_1", "ymin": 48, "xmin": 28, "ymax": 58, "xmax": 38},
        {"object_id": "cutting_board_1", "ymin": 10, "xmin": 35, "ymax": 22, "xmax": 55},
        {"object_id": "plate_stack", "ymin": 28, "xmin": 78, "ymax": 42, "xmax": 90},
        {"object_id": "mug_1", "ymin": 18, "xmin": 52, "ymax": 28, "xmax": 62},
        {"object_id": "sponge_1", "ymin": 22, "xmin": 68, "ymax": 30, "xmax": 75},
    ]

    goal = "Clean this kitchen"
    node_name = "kitchen_main"

    print("Calling planner with live Gemini (use_mock=False)...")
    print(f"  Goal: {goal}")
    print(f"  Room: {node_name}")
    print()

    try:
        result = generate_task_dag(
            topology=topology,
            locations=locations,
            goal=goal,
            node_name=node_name,
            use_mock=False,
            robot_type="humanoid",
        )
    except Exception as e:
        print(f"Planner failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    trace = result.planner_trace
    print("Planner result:")
    print(f"  task_id: {result.task_id}")
    print(f"  mode: {trace.mode}, model: {trace.model}")
    print(f"  validation_passed: {trace.validation_passed}")
    if trace.errors:
        print(f"  errors: {trace.errors}")
    print(f"  subtasks: {len(result.subtasks)}")
    for st in result.subtasks:
        loc = f" ({st.location.x:.1f}, {st.location.y:.1f})" if st.location else ""
        desc = st.description[:50] + "..." if len(st.description) > 50 else st.description
        print(f"    - {st.id}: {st.action} | {desc} | objects={st.objects}{loc}")
    if result.warnings:
        print("  warnings:", result.warnings)
    print()
    print("Live Gemini test passed.")

    # Exercise robot_type wiring with quadruped (optional second run)
    print()
    print("Calling planner with robot_type=quadruped...")
    try:
        result2 = generate_task_dag(
            topology=topology,
            locations=locations,
            goal="Navigate to the sink and back",
            node_name=node_name,
            use_mock=False,
            robot_type="quadruped",
        )
        print(f"  task_id: {result2.task_id}, subtasks: {len(result2.subtasks)}")
        print("Quadruped robot_type test passed.")
    except Exception as e:
        print(f"Quadruped run failed (non-fatal): {e}")

if __name__ == "__main__":
    main()
