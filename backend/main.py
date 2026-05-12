import networkx as nx
import base64
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional, Union, Literal
from pydantic import BaseModel

from vla_service import VLAService
from planner import PlannerRequest, generate_task_dag
from plan_qa import get_goal_or_question
from cache import (
    get_cache_key,
    load_topology,
    save_topology,
    load_layout,
    save_layout,
    load_map,
    save_map,
    load_plan,
    save_plan,
)

app = FastAPI(title="RPG — Robotic Planning with Gemini")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage
session_graph = nx.DiGraph()
node_data: Dict[str, Any] = {}
node_images: Dict[str, list] = {}       # Store source images per node
node_map_images: Dict[str, str] = {}    # Store generated map (data URL) per node
node_locations: Dict[str, list] = {}
node_cache_keys: Dict[str, str] = {}    # image cache key per node
planning_runs: Dict[str, Any] = {}


class QueryPayload(BaseModel):
    user_query: str
    current_node: str


class ChatPayload(BaseModel):
    query: str
    node_name: str
    history: List[Dict[str, str]] = []


class PlanQAPayload(BaseModel):
    message: str
    node_name: str
    history: List[Dict[str, str]] = []
    use_mock: bool = False
    robot_type: str = "humanoid"


# Plan-QA response models for consistent JSON output and OpenAPI docs
class PlanSummary(BaseModel):
    goal: str
    room: str
    subtask_count: int
    dependency_count: int


class PlanQAQuestionResponse(BaseModel):
    status: Literal["question"] = "question"
    text: str


class PlanQAErrorResponse(BaseModel):
    status: Literal["error"] = "error"
    message: str
    errors: Optional[List[str]] = None


class PlanQAPlanResponse(BaseModel):
    status: Literal["plan"] = "plan"
    plan: Dict[str, Any]
    plan_summary: PlanSummary


@app.post("/api/upload-node")
async def upload_node(
    node_name: str = Form(...),
    images: List[UploadFile] = File(...)
):
    filenames: List[str] = []
    gemini_images = []
    for img in images:
        content = await img.read()
        filenames.append(img.filename or "")
        gemini_images.append({
            "mime_type": img.content_type,
            "data": base64.b64encode(content).decode('utf-8')
        })

    cache_key = get_cache_key(filenames)

    try:
        # ── Step 1: Topology (cache or API) ──
        cached_topology = load_topology(cache_key)
        if cached_topology is not None:
            actual_name, topology = cached_topology
            print(f"[Step 1/3] ✓ Topology from cache: {actual_name}")
        else:
            print(f"[Step 1/3] Extracting topology for '{node_name}'...")
            actual_name, topology = VLAService.decompose_scene(gemini_images, node_name)
            save_topology(cache_key, actual_name, topology)
            print(f"[Step 1/3] ✓ Topology extracted: {actual_name}")

        # ── Step 2: Bird's-Eye Map (cache or layout + image API) ──
        map_image = load_map(cache_key)
        if map_image is not None:
            print(f"[Step 2/3] ✓ Map from cache")
        else:
            print(f"[Step 2/3] Generating bird's-eye view map...")
            try:
                layout_text = load_layout(cache_key)
                if layout_text is None:
                    layout_text = VLAService.extract_layout_description(gemini_images, topology)
                    save_layout(cache_key, layout_text)
                map_image = VLAService.generate_birds_eye_image_from_layout(layout_text)
                save_map(cache_key, map_image)
                print(f"[Step 2/3] ✓ Map generated successfully")
            except Exception as e:
                print(f"[Step 2/3] ⚠ Map generation failed: {e}, using placeholder")
                map_image = "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=1000"

        # ── Step 3: Spatial Localization ──
        locations = []
        if map_image.startswith("data:"):
            print(f"[Step 3/3] Localizing objects on map...")
            try:
                locations = VLAService.locate_objects_in_map(map_image, topology)
                print(f"[Step 3/3] ✓ Located {len(locations)} objects")
            except Exception as e:
                print(f"[Step 3/3] ⚠ Localization failed: {e}")
        else:
            print(f"[Step 3/3] ⏭ Skipping localization (no generated map)")

        # Store results
        session_graph.add_node(actual_name, captured=True)
        node_data[actual_name] = topology
        node_images[actual_name] = gemini_images
        node_map_images[actual_name] = map_image
        node_locations[actual_name] = locations
        node_cache_keys[actual_name] = cache_key

        nodes = list(session_graph.nodes())
        if len(nodes) > 1:
            session_graph.add_edge(nodes[-2], actual_name)

        return {
            "status": "success",
            "node_name": actual_name,
            "topology": topology,
            "map_image": map_image,
            "locations": locations,
            "message": f"Processed {len(images)} images → {actual_name}"
        }
    except Exception as e:
        print(f"VLA Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat")
async def chat(payload: ChatPayload):
    topology = node_data.get(payload.node_name)
    if not topology:
        # Use the most recent node if the specified one is not found
        if node_data:
            payload.node_name = list(node_data.keys())[-1]
            topology = node_data[payload.node_name]
        else:
            raise HTTPException(status_code=404, detail="No environment data available. Process a node first.")

    try:
        # Get the stored map image and source images for this node
        map_img = node_map_images.get(payload.node_name)
        source_imgs = node_images.get(payload.node_name)

        response_text = VLAService.chat_with_environment(
            payload.query, topology, payload.history,
            map_image_b64=map_img,
            source_images=source_imgs
        )
        return {"response": response_text, "node_name": payload.node_name}
    except Exception as e:
        print(f"Chat Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/plan-qa")
async def plan_qa(payload: PlanQAPayload):
    print(f"[plan-qa] Request: message={payload.message[:80]!r}{'...' if len(payload.message) > 80 else ''}, node_name={payload.node_name!r}, history_len={len(payload.history)}, use_mock={payload.use_mock}")
    topology = node_data.get(payload.node_name)
    if not topology:
        if node_data:
            payload.node_name = list(node_data.keys())[-1]
            topology = node_data[payload.node_name]
            print(f"[plan-qa] Node not found, using latest: node_name={payload.node_name!r}")
        else:
            print("[plan-qa] No topology: returning error (no environment data)")
            return PlanQAErrorResponse(
                message="No environment data available. Process a node first."
            ).model_dump(mode="json")
    else:
        print(f"[plan-qa] Topology resolved for node_name={payload.node_name!r}")

    try:
        print("[plan-qa] Calling get_goal_or_question(...)")
        result = get_goal_or_question(
            history=payload.history,
            message=payload.message,
            node_name=payload.node_name,
            topology=topology,
        )
    except Exception as e:
        print(f"[plan-qa] Plan QA Error (goal/question): {e}")
        raise HTTPException(status_code=500, detail=str(e))

    if "goal" in result:
        goal = result["goal"]
        print(f"[plan-qa] Goal extracted: {goal!r}")
        locations = node_locations.get(payload.node_name, [])
        print(f"[plan-qa] Locations count: {len(locations)}")

        image_key = node_cache_keys.get(payload.node_name)
        cached_plan = load_plan(image_key, goal, payload.robot_type) if image_key and not payload.use_mock else None
        if cached_plan is not None:
            print(f"[plan-qa] ✓ Plan from cache: task_id={cached_plan.get('task_id')!r}")
            planning_runs[cached_plan["task_id"]] = cached_plan
            plan_summary = PlanSummary(
                goal=cached_plan.get("goal", goal),
                room=cached_plan.get("room", payload.node_name),
                subtask_count=len(cached_plan.get("subtasks", [])),
                dependency_count=len(cached_plan.get("dependency_graph", {}).get("edges", [])),
            )
            return PlanQAPlanResponse(plan=cached_plan, plan_summary=plan_summary).model_dump(mode="json")

        try:
            print("[plan-qa] Calling generate_task_dag(...)")
            plan_result = generate_task_dag(
                topology=topology,
                locations=locations,
                goal=goal,
                node_name=payload.node_name,
                use_mock=payload.use_mock,
                robot_type=payload.robot_type,
            )
        except Exception as e:
            print(f"[plan-qa] Plan QA Error (generate_task_dag): {e}")
            return PlanQAErrorResponse(message=str(e)).model_dump(mode="json")
        plan_dict = plan_result.model_dump(mode="json")
        if plan_result.planner_trace and not plan_result.planner_trace.validation_passed:
            print(f"[plan-qa] Validation failed: errors={plan_result.planner_trace.errors}")
            return PlanQAErrorResponse(
                message="Planner validation failed",
                errors=plan_result.planner_trace.errors,
            ).model_dump(mode="json")
        print(f"[plan-qa] Plan generated: task_id={plan_result.task_id!r}, subtasks={len(plan_result.subtasks)}, validation_passed={getattr(plan_result.planner_trace, 'validation_passed', None)}")
        if image_key:
            save_plan(image_key, goal, payload.robot_type, plan_dict)
            print(f"[plan-qa] Plan saved to cache")
        planning_runs[plan_result.task_id] = plan_dict
        plan_summary = PlanSummary(
            goal=plan_result.goal,
            room=plan_result.room,
            subtask_count=len(plan_result.subtasks),
            dependency_count=len(plan_result.dependency_graph.edges),
        )
        print(f"[plan-qa] Returning status=plan, task_id={plan_result.task_id!r}")
        return PlanQAPlanResponse(
            plan=plan_dict,
            plan_summary=plan_summary,
        ).model_dump(mode="json")

    question = result.get("question", "What task would you like me to plan?")
    print(f"[plan-qa] Returning status=question: {question!r}")
    return PlanQAQuestionResponse(text=question).model_dump(mode="json")


@app.post("/api/query-planner")
async def query_planner(payload: QueryPayload):
    current_node = payload.current_node
    if current_node not in session_graph.nodes() and len(session_graph.nodes()) > 0:
        current_node = list(session_graph.nodes())[0]

    nodes_list = list(session_graph.nodes())
    edges_list = list(session_graph.edges())
    context_data = {n: node_data.get(n, {}).get("dynamic_objects", []) for n in nodes_list}

    try:
        result = VLAService.plan_trajectory(
            nodes_list, edges_list, context_data, current_node, payload.user_query
        )
        return result
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.get("/api/graph")
async def get_graph():
    nodes = [{"id": n, "data": {"label": n}, "vla": node_data.get(n)} for n in session_graph.nodes()]
    edges = [{"id": f"e-{u}-{v}", "source": u, "target": v} for u, v in session_graph.edges()]
    return {"nodes": nodes, "edges": edges}


@app.get("/api/node/{node_id}")
async def get_node_detail(node_id: str):
    if node_id not in node_data:
        raise HTTPException(status_code=404, detail="Node not found")
    return node_data[node_id]


@app.get("/api/node/{node_id}/images")
async def get_node_images(node_id: str):
    """Return the original 8 source images as data URLs for the interactive map."""
    images = node_images.get(node_id, [])
    if not images:
        raise HTTPException(status_code=404, detail="No images found for this node")
    
    result = []
    for img in images:
        data_url = f"data:{img['mime_type']};base64,{img['data']}"
        result.append(data_url)
    return {"node_id": node_id, "images": result, "count": len(result)}


@app.post("/api/task-plan")
async def task_plan(payload: PlannerRequest):
    topology = node_data.get(payload.node_name)
    if not topology:
        raise HTTPException(status_code=404, detail="Node not found")
    locations = node_locations.get(payload.node_name, [])
    robot_type = payload.robot_type.value

    image_key = node_cache_keys.get(payload.node_name)
    cached_plan = load_plan(image_key, payload.goal, robot_type) if image_key else None
    if cached_plan is not None:
        print(f"[task-plan] ✓ Plan from cache: task_id={cached_plan.get('task_id')!r}")
        planning_runs[cached_plan["task_id"]] = cached_plan
        return cached_plan

    result = generate_task_dag(
        topology=topology,
        locations=locations,
        goal=payload.goal,
        node_name=payload.node_name,
        use_mock=False,
        robot_type=robot_type,
    )
    if result.planner_trace and not result.planner_trace.validation_passed:
        raise HTTPException(
            status_code=500,
            detail={"message": "Planner validation failed", "errors": result.planner_trace.errors},
        )
    plan_dict = result.model_dump(mode="json")
    if image_key:
        save_plan(image_key, payload.goal, robot_type, plan_dict)
        print(f"[task-plan] Plan saved to cache")
    planning_runs[result.task_id] = plan_dict
    return result


@app.get("/api/task-plan/{task_id}")
async def get_task_plan(task_id: str):
    if task_id not in planning_runs:
        raise HTTPException(status_code=404, detail="Task plan not found")
    return planning_runs[task_id]

