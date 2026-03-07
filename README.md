# RPG — Robotic Planning with Gemini

Zero-shot task planning for heterogeneous robot embodiments in previously unseen indoor environments, powered by multimodal foundation models.

---

## Motivation

Deploying robots in real-world indoor spaces is fundamentally constrained by two problems: environments are **unknown ahead of time**, and robot morphologies **dictate what actions are physically feasible**. A humanoid can reach a high shelf; a quadruped cannot. A mobile base can sweep an open floor; it cannot navigate a cluttered corridor. Traditional planning stacks require pre-built maps, hand-coded action libraries, and per-robot engineering. RPG eliminates all three by using a single multimodal model (Google Gemini) to perceive, map, and plan — with embodiment-specific constraints enforced at every stage.

The system operates entirely from photographs. No LiDAR, no SLAM, no prior map data. A user walks through an unseen room, uploads sequential photos, and RPG synthesizes a structured spatial understanding, a generated floor plan, and a validated task plan — all conditioned on the selected robot morphology.

---

## Core Capabilities

### Planning in Unseen Environments

RPG treats every environment as unknown. There is no reliance on pre-existing maps, object databases, or spatial priors. The full perception-to-plan pipeline runs from raw imagery:

1. **Topology extraction** — Sequential photographs are encoded and sent as a single multimodal prompt to Gemini. The model returns structured JSON containing a descriptive node name, static anchors (immovable structures and heavy furniture), dynamic objects (movable items), and navigable edges (pathways out of the area). Each entity includes a specific type label, natural-language description, and the image indices where it was observed.

2. **Text-bridge mapping** — To generate an accurate 2D floor plan without 3D hallucination, RPG introduces a two-stage text bridge. First, Gemini receives the photographs alongside the extracted topology and produces a purely textual architectural layout description — room shape, relative 2D positions of all entities, no colors or lighting. This text-only representation is then passed to an image-generation model to synthesize an orthographic, top-down blueprint. Decoupling perception from generation prevents the image model from producing perspective views or inventing spatial structure not present in the source photos.

3. **Object localization** — The generated floor plan image and the full entity list are sent to a vision model, which returns normalized bounding boxes (0–100% of image dimensions) for each anchor and object. These coordinates are merged with the topology to produce a **grounded context**: every entity the planner can reference has an ID, type, description, and optional map position.

4. **Content-addressed caching** — Topology, layout text, and map images are cached under a truncated SHA-256 hash of the sorted input filenames. Repeated uploads with the same image set skip all API calls and return cached results immediately.

Because the system constructs its world model entirely from input imagery, it generalizes to any indoor space — kitchens, warehouses, offices, hospital rooms — without retraining or reconfiguration.

### Embodiment-Aware Task Planning

RPG supports three distinct robot morphologies, each with a curated action vocabulary and a dedicated system prompt that encodes physical capabilities and restrictions:

| Embodiment | Action Vocabulary | Physical Constraints |
|---|---|---|
| **Humanoid** | 70+ actions — `navigate`, `pick_up`, `place`, `grab`, `carry`, `open`, `close`, `push`, `pull`, `reach`, `lift`, `pour`, `wipe`, `sweep`, `cut`, `chop`, `serve`, `fold`, `plug_in`, `assemble`, ... | Full manipulation at all heights. Arms, upright posture, fine motor control. No restrictions beyond observed environment. |
| **Quadruped** | 25 actions — `navigate`, `patrol`, `inspect`, `monitor`, `push_low`, `nudge`, `follow`, `guard`, `detect`, `sniff`, `alert`, `track`, `search`, `escort`, `approach`, `retreat`, ... | Low reach only. No grasping, no high surfaces (shelves, countertops, tables). Navigation, floor-level interaction, and surveillance tasks. |
| **Mobile Base** | 21 actions — `navigate`, `sweep`, `clean`, `mop`, `vacuum`, `patrol`, `cover_area`, `dock`, `undock`, `inspect_floor`, `follow_path`, `return_to_base`, `charge`, ... | Floor-level only. No manipulation, no tight spaces. Open-area navigation, floor cleaning, and waypoint traversal. |

The action sets are defined as strict allow-lists. When the planner generates a task DAG, every subtask's `action` field is validated against the allow-list for the selected embodiment. Plans that reference disallowed actions are rejected and sent through an automatic repair cycle.

**Same goal, different embodiments.** Given the goal "Clean the kitchen":
- A **humanoid** plan includes picking up dishes, wiping countertops, opening cabinets, and carrying items to the sink.
- A **quadruped** plan includes navigating to each zone, inspecting the floor for debris, and pushing low objects aside.
- A **mobile base** plan includes sweeping the open floor area, vacuuming under the table, and returning to its dock.

The planner system prompt explicitly instructs the model to omit infeasible subtasks rather than hallucinate actions the robot cannot perform.

---

## Planning Pipeline

The planner converts a natural-language goal into a grounded, acyclic task DAG with validated dependencies and map-referenced locations.

### Goal Extraction

User messages first pass through a **Plan Q&A** stage. A Gemini call receives the full conversation history and the room's topology summary, then classifies the message as either a clear goal (e.g., "Make spaghetti") or an ambiguous statement requiring a follow-up question. Only unambiguous goals proceed to DAG generation.

### Grounded Context Assembly

Topology and localization data are merged into a unified structure. Static anchors and dynamic objects are normalized into a single entity dictionary. Each entity carries its ID, kind (`anchor` or `object`), type, description, and — when localization succeeded — a `map_center` (centroid of its bounding box) and `map_bbox` (normalized coordinates). Navigable edges are preserved for spatial reasoning.

### DAG Generation

The planner model receives:
- A **robot-specific system prompt** describing the embodiment's capabilities, restrictions, and the full allowed action list.
- A **user prompt** listing the room name, robot type, all available entities (with localization status), the goal, and the expected JSON output schema.

The model returns a structured JSON object:

```json
{
  "task_id": "task_kitchen_a3f9b2c1",
  "goal": "Clean the kitchen",
  "room": "kitchen_main",
  "subtasks": [
    {
      "id": "t1",
      "action": "navigate",
      "description": "Move to the kitchen sink area",
      "objects": ["sink"],
      "depends_on": [],
      "preconditions": [],
      "success_criteria": ["Robot is near the sink"],
      "duration_estimate_sec": 10
    },
    {
      "id": "t2",
      "action": "pick_up",
      "description": "Pick up dirty dishes from the counter",
      "objects": ["dishes", "counter"],
      "depends_on": ["t1"],
      "preconditions": ["Robot is near the counter"],
      "success_criteria": ["Dishes are in robot's gripper"]
    }
  ],
  "dependency_graph": {
    "nodes": ["t1", "t2"],
    "edges": [{"source": "t2", "target": "t1"}]
  },
  "warnings": []
}
```

### Deterministic Grounding

After parsing, the system fills in subtask locations deterministically. For each subtask referencing entity IDs, `map_center` coordinates from the grounded context are assigned. When a subtask references multiple entities, the centroid of their map centers is used. Subtasks referencing entities without map coordinates receive warnings.

### Validation and Repair

Seven validation checks run on every generated plan:

1. **Duplicate task IDs** — No two subtasks share the same ID.
2. **Dependency references** — Every `depends_on` entry points to an existing task ID.
3. **Known objects** — Every entity ID referenced in `objects` exists in the topology. Planner-style suffixes (e.g., `mug_1` resolving to `mug`) are handled.
4. **Cycle detection** — NetworkX verifies the dependency graph is acyclic.
5. **Graph consistency** — The `dependency_graph.nodes` set matches the subtask ID set; all edge endpoints reference valid tasks.
6. **Location bounds** — Any assigned coordinates fall within [0, 100].
7. **Action-embodiment compliance** — Every subtask action is in the allowed set for the selected robot type.

If validation fails, a **single repair attempt** is made: the original output, the specific validation errors, and the valid entity list are sent back to the model with instructions to fix and return corrected JSON. The repaired output is re-validated. If it still fails, the trace is marked accordingly and returned with error details.

### Execution Order

A topological sort (Kahn's algorithm over the reversed dependency graph) produces a linear execution order. Ties among independent subtasks are broken by task ID for deterministic sequencing.

---

## System Architecture

```
Frontend (Next.js 16 / React 19 / TypeScript)             :3000
├── Landing → Robot Selection → Spatial Capture → Results
├── InteriorMap       — Generated floor plan, bounding boxes, plan overlays
├── SemanticGraph     — D3 radial topology visualization
├── GraphVisualizer   — React Flow multi-node session graph
├── CommandBar        — Chat interface for spatial Q&A and plan requests
└── InteractivePlan   — React Flow task DAG, execution order display

           ↕  REST (JSON, multipart/form-data)

Backend (FastAPI / Uvicorn / Python 3.10+)                 :8000
├── POST /api/upload-node     — 3-stage pipeline: topology → map → localization
├── POST /api/chat            — Multimodal spatial Q&A (map + photos + topology)
├── POST /api/plan-qa         — Goal extraction → embodiment-aware task DAG
├── POST /api/task-plan       — Direct task DAG generation
├── GET  /api/task-plan/{id}  — Retrieve stored plan
├── POST /api/query-planner   — Multi-node trajectory planning
├── GET  /api/graph           — Session graph (nodes + edges)
└── GET  /api/node/{id}[/images] — Node topology and source images
```

### Backend Modules

| Module | Responsibility |
|---|---|
| `vla_service.py` | Topology extraction, layout description, map generation, object localization, multimodal chat |
| `plan_qa.py` | Conversational goal extraction with follow-up question logic |
| `planner/planner_service.py` | End-to-end DAG generation: context assembly, model call, parsing, grounding, validation, repair |
| `planner/planner_prompts.py` | Per-embodiment system prompts, allowed action vocabularies, prompt construction |
| `planner/planner_schemas.py` | Pydantic models — `PlannerOutput`, `Subtask`, `DependencyGraph`, `ValidationResult` |
| `planner/planner_normalization.py` | Topology + localization merge, entity ID resolution, centroid computation |
| `planner/planner_validators.py` | Seven-check validation suite, NetworkX cycle detection, Kahn's topological sort |
| `cache.py` | Content-addressed file cache (SHA-256 key, topology/layout/map persistence) |
| `model_config.py` | Centralized Gemini model identifiers (single-file model swapping) |
| `genai_retry.py` | Exponential backoff and 429 rate-limit retry for Gemini API calls |

### Gemini Model Allocation

| Pipeline Stage | Model | Output |
|---|---|---|
| Topology extraction | `gemini-3-flash-preview` | Structured JSON (anchors, objects, edges) |
| Layout description | `gemini-3-flash-preview` | Textual 2D architectural layout |
| Floor plan generation | `gemini-3.1-flash-image-preview` | Orthographic top-down blueprint image |
| Object localization | `gemini-3-flash-preview` | Normalized bounding boxes (JSON) |
| Spatial chat | `gemini-3-flash-preview` | Natural-language responses with spatial context |
| Goal extraction | `gemini-3-flash-preview` | Goal string or clarification question (JSON) |
| Task planning | `gemini-3-flash-preview` | Grounded task DAG (JSON) |

All models are configured in a single file (`model_config.py`). Swapping a model requires changing one string.

---

## Frontend

The interface is built with Next.js 16 (App Router), React 19, TypeScript, and Tailwind CSS 4.

**Spatial Capture** — Upload sequential room photographs (captured while walking the space). The system processes them through the three-stage backend pipeline and returns topology, a generated floor plan, and object locations.

**Interior Map** — Displays the generated bird's-eye floor plan with entity bounding boxes overlaid. When a plan is active, subtask locations and dependency arrows are rendered on the map.

**Semantic Graph** — A D3-powered radial visualization of the room's topology: the node at center, static anchors and dynamic objects as satellite nodes, navigable edges as connections.

**Plan Q&A** — A conversational interface where users describe tasks in natural language. The system extracts goals, generates embodiment-constrained plans, and renders the resulting task DAG as an interactive React Flow graph with execution order annotations.

**Robot Selection** — Users choose between humanoid, quadruped, and mobile base before entering the planning interface. The selection persists across the session and conditions all downstream planning.

---

## Setup

### Requirements
- Python 3.10+
- Node.js 18+
- Google AI Studio API key ([aistudio.google.com/apikey](https://aistudio.google.com/apikey))

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
echo "GOOGLE_API_KEY=<your-key>" > .env
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`. Select an embodiment, capture a space, and start planning.

---

## License

MIT
