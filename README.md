# RPG — Robotic Planning with Gemini

> Capture photos of a room, and Gemini builds a semantic map and task plans tailored to your robot.

---

## What Is This?

**RPG (Robotic Planning with Gemini)** is a Vision-Language-Action (VLA) system that turns ordinary room photos into an interactive indoor map and generates **embodiment-aware** task plans. You choose a robot type (humanoid, quadruped, or mobile base), describe a goal in natural language, and get a grounded task DAG with map coordinates—all powered by Gemini.

**High-level flow:**
1. **Capture** — Walk a loop and capture sequential photos of the space.
2. **Map** — Gemini extracts topology, generates a bird's-eye floor plan, and localizes objects.
3. **Plan** — Describe a task; Gemini produces a task DAG with dependencies, restricted to your robot’s capabilities.
4. **Execute** — View the plan on the map and (optionally) send waypoints to a robot stack (e.g. Nav2).

---

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- A [Google AI Studio](https://aistudio.google.com/) API Key

### 1. Clone the Repo
```bash
git clone <your-repo-url>
cd EmbodiedAIMapGeneration
```

### 2. Set Up Your Gemini API Key
Create a `.env` file in the `backend/` folder:
```bash
echo GOOGLE_API_KEY=your_api_key_here > backend/.env
```
> Get your free API key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

### 3. Start the Backend
```bash
cd backend
python -m venv venv
# source venv/bin/activate   # Mac/Linux
# .\venv\Scripts\activate    # Windows
pip install -r requirements.txt
uvicorn main:app --reload
```
Backend runs on `http://localhost:8000`

### 4. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:3000`

### 5. Use the App
1. Open `http://localhost:3000`
2. **Select robot type** (Humanoid, Quadruped, or Mobile Base)
3. Go to **Spatial Capture** and enter a **Node Name** (e.g. `kitchen`)
4. Upload **sequential photos** taken while walking the space
5. Click **"Synthesize Environment"** and wait for the 3-step pipeline
6. Explore **Map** and **Graph** views, then use **Plan Q&A** to describe a task and get an interactive plan

---

## Models Used

All models are configured in `backend/model_config.py`. You can switch models by editing that file only.

| Step / Feature | Model | Purpose |
|----------------|-------|---------|
| **Topology extraction** | `gemini-3-flash-preview` | Analyze images → structured JSON: `node_name`, `static_anchors`, `dynamic_objects`, `navigable_edges` |
| **Layout description** | `gemini-3-flash-preview` | Convert photos + topology → pure text 2D layout (text bridge for map gen) |
| **Bird's-eye map** | `gemini-3.1-flash-image-preview` | Generate 2D floor-plan image from layout text only |
| **Object localization** | `gemini-3-flash-preview` | Detect bounding boxes (0–100% coords) for anchors/objects on the map |
| **Spatial chat** | `gemini-3-flash-preview` | Q&A about the environment (map + topology + source images) |
| **Plan Q&A (goal vs question)** | `gemini-3-flash-preview` | Decide if user message is a clear goal or needs a follow-up question |
| **Task planner** | `gemini-3-flash-preview` | Generate grounded task DAG with robot-type restrictions |

---

## Technical Overview

### 1. Image processing

- **Input:** Sequential photos of a single space (e.g. 8 directions or a walk-through loop).
- **Encoding:** Images are base64-encoded and sent to Gemini with MIME type (e.g. `image/jpeg`).
- **Topology extraction:** A single multimodal call takes all images and returns strict JSON:
  - **node_name** — Descriptive name for the location
  - **static_anchors** — Immovable structure/furniture (`anchor_id`, `type`, `description`, `image_indices`)
  - **dynamic_objects** — Movable objects (`object_id`, `type`, `description`, `image_indices`)
  - **navigable_edges** — Pathways out of the area (`edge_id`, `description`, `visual_cue`)
- **Caching:** Topology and layout text are cached by content hash so repeated runs skip redundant API calls.

### 2. Mapping

- **Step 2a — Layout description:** A second Gemini call (same images + topology) produces a **text-only** 2D layout: room shape, relative positions of anchors and objects, no colors. This “text bridge” avoids feeding raw photos into the image model and reduces 3D hallucination.
- **Step 2b — Bird's-eye image:** An **image-generation** model receives only this layout text and generates an orthographic, top-down floor plan (minimal blueprint style, no labels). Aspect ratio is fixed (e.g. 16:9).
- **Step 3 — Object localization:** The generated map image plus the list of anchors/objects is sent to a vision model. It returns a JSON array of `object_id` and normalized bounding boxes (`xmin`, `ymin`, `xmax`, `ymax` as 0–100% of image size). These are merged with topology into a **grounded context** (entities + map centers/bboxes) used later by the planner.

### 3. Plan generation

- **Goal vs question:** User messages go through **Plan Q&A** (`plan_qa.py`). A Gemini call with conversation history and room topology decides whether the message is a **goal** (single-sentence task) or requires a **follow-up question**. Only when a clear goal is returned does the system call the planner.
- **Grounded context:** Topology and localization results are normalized (`planner_normalization.py`) into a single structure: room name, entities (anchors + objects) with optional `map_center` / `map_bbox`. This is the only world model the planner sees.
- **Task DAG:** The planner (`planner_service.py`) receives goal, robot type, and grounded context. It calls Gemini with a **robot-specific system prompt** and a user prompt listing allowed actions, available entities, and the goal. The model returns JSON: `task_id`, `goal`, `room`, `subtasks` (id, action, description, objects, depends_on, etc.), and `dependency_graph` (nodes, edges). Subtask locations are filled deterministically from entity map centers when the model references `objects`.
- **Validation & repair:** Output is validated (`planner_validators.py`): no unknown object IDs, no invalid `depends_on`, no cycles, dependency graph consistent with subtasks, and **all actions in the allowed set for the selected robot type**. On failure, a repair prompt is sent to Gemini once; the result is re-validated.
- **Execution order:** A topological sort of the dependency graph yields a linear execution order used by the UI and downstream execution.

### 4. Embodiment restriction

- **Robot types:** The system supports **humanoid**, **quadruped**, and **mobile_base**. The frontend lets the user pick one (e.g. on the select-robot page); the choice is passed as `robot_type` to the plan-QA and planner APIs.
- **Allowed actions:** Each robot type has a fixed set of action verbs (`planner_prompts.py`). Examples:
  - **Humanoid:** navigate, pick_up, place, open, clean, pour, … (full manipulation and navigation).
  - **Quadruped:** navigate, patrol, inspect, push_low, follow, … (no high reach, no fine manipulation).
  - **Mobile base:** navigate, sweep, vacuum, dock, patrol, … (floor-focused, no manipulation).
- **System prompts:** The planner uses a different system prompt per robot type, describing capabilities and **restrictions** (e.g. “Do NOT plan high reach for quadruped”, “Do NOT plan grasping for mobile base”).
- **Validation:** After each plan, `validate_actions_for_robot` ensures every subtask’s `action` is in the allowed set for the current `robot_type`. Invalid plans are rejected or sent for repair.

Together, this keeps generated plans within the chosen embodiment’s capabilities and avoids infeasible actions.

---

## Use Cases

- **Indoor navigation & spatial Q&A** — “Where is the coffee pot?”, “How do I get to the fridge?”, “What’s near the door?” using the generated map and topology.
- **Single-room task planning** — “Clean the kitchen”, “Make spaghetti”, “Tidy the living room”. Get a step-by-step DAG with dependencies and map-referenced locations.
- **Robot-specific plans** — Same goal, different robot:
  - **Humanoid:** Full cleanup and manipulation (pick objects, use counters, open cabinets).
  - **Quadruped:** Navigation and low-level tasks only (patrol, inspect floor, nudge low objects).
  - **Mobile base:** Floor coverage (sweep, vacuum, dock) and waypoint navigation.
- **Integration with robot stacks** — Export waypoints or execution order for use with Nav2 (e.g. `follow_waypoints`) or other execution layers.
- **Prototyping and demos** — Quickly capture a space with a phone, generate map + plan, and iterate on prompts or robot types without deploying hardware.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Frontend (Next.js)              http://localhost:3000           │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐ │
│  │ Select Robot │ │ MAP / GRAPH   │ │ Plan Q&A                  │ │
│  │ Spatial      │ │ InteriorMap  │ │ Chat + InteractivePlanView│ │
│  │ Capture      │ │ SemanticGraph│ │ (goal → task DAG)         │ │
│  └──────────────┘ └──────────────┘ └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
         │                  │                        │
         ▼                  ▼                        ▼
┌─────────────────────────────────────────────────────────────────┐
│  Backend (FastAPI)                 http://localhost:8000          │
│  POST /api/upload-node  →  3-step pipeline (topology, map, locs) │
│  POST /api/chat          →  Spatial Q&A (map + topology + images)│
│  POST /api/plan-qa       →  Goal vs question → task DAG (robot)  │
│  POST /api/task-plan     →  Direct task DAG from goal + robot_type│
│  GET  /api/node/{id}/images → Source images for map UI           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
EmbodiedAIMapGeneration/
├── backend/
│   ├── main.py                 # FastAPI app, upload/chat/plan-qa/task-plan
│   ├── vla_service.py          # Topology, layout, map image, localization, chat
│   ├── plan_qa.py              # Goal vs question (Gemini)
│   ├── model_config.py         # All Gemini model names (single place)
│   ├── cache.py                # Topology/layout/map caching
│   ├── genai_retry.py          # Rate-limit and 429 retry for Gemini
│   ├── planner/
│   │   ├── planner_service.py  # generate_task_dag, Gemini + grounding + validation
│   │   ├── planner_prompts.py # Robot-specific prompts and allowed actions
│   │   ├── planner_schemas.py # PlannerOutput, Subtask, DependencyGraph, etc.
│   │   ├── planner_normalization.py  # build_grounded_context, normalize topology/locations
│   │   └── planner_validators.py     # DAG checks, action-robot validation
│   └── requirements.txt
├── frontend/
│   └── app/
│       ├── page.tsx            # Landing
│       ├── select-robot/       # Robot type selection
│       ├── dashboard/           # Capture (NodeCapture) and results (Map/Graph + Plan Q&A)
│       ├── components/
│       │   ├── NodeCaptureComponent.tsx
│       │   ├── InteriorMapComponent.tsx  # Map, waypoints, plan overlay
│       │   ├── SemanticGraph.tsx
│       │   ├── CommandBarComponent.tsx  # Chat + plan request
│       │   ├── InteractivePlanView.tsx
│       │   └── ...
│       └── lib/api.ts
└── README.md
```

---

## Example Queries (Spatial Chat)

- *"Where is the coffee pot?"*
- *"What objects are near the refrigerator?"*
- *"How can I get to the door from here?"*
- *"Describe the layout of this room."*

## Example Goals (Plan Q&A)

- *"Clean the kitchen"*
- *"Make spaghetti"*
- *"Tidy the living room"*

---

## License

MIT
