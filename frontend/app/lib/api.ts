const API_BASE_URL = "http://localhost:8000/api";

export interface SpatialNode {
    node_name: string;
    static_anchors: { anchor_id: string; type: string; description: string; image_indices: number[] }[];
    dynamic_objects: { object_id: string; type: string; description: string; image_indices: number[] }[];
    navigable_edges: { edge_id: string; description: string; visual_cue: string }[];
}

export interface ObjectLocation {
    object_id: string;
    ymin: number;
    xmin: number;
    ymax: number;
    xmax: number;
}

/** Plan QA response: either a follow-up question or a full task plan */
export type PlanQAResponse =
    | { status: "question"; text: string }
    | { status: "plan"; plan: PlannerOutput; plan_summary: PlanSummary }
    | { status: "error"; message: string; errors?: string[] };

export interface PlanSummary {
    goal: string;
    room: string;
    subtask_count: number;
    dependency_count: number;
}

export interface TaskLocation {
    x: number;
    y: number;
    label?: string;
}

export interface Subtask {
    id: string;
    action: string;
    description: string;
    objects: string[];
    location?: TaskLocation | null;
    duration_estimate_sec?: number | null;
    depends_on: string[];
    preconditions: string[];
    success_criteria: string[];
}

export interface DependencyGraph {
    nodes: string[];
    edges: { source: string; target: string }[];
}

export interface PlannerOutput {
    task_id: string;
    goal: string;
    room: string;
    subtasks: Subtask[];
    dependency_graph: DependencyGraph;
    warnings: string[];
    planner_trace?: { mode: string; model: string; validation_passed: boolean; errors: string[] };
    execution_order?: string[];
}

export const api = {
    uploadNode: async (formData: FormData) => {
        const res = await fetch(`${API_BASE_URL}/upload-node`, {
            method: "POST",
            body: formData,
        });
        return res.json();
    },

    queryPlanner: async (userQuery: string, currentNode: string) => {
        const res = await fetch(`${API_BASE_URL}/query-planner`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_query: userQuery, current_node: currentNode }),
        });
        return res.json();
    },

    getGraph: async () => {
        const res = await fetch(`${API_BASE_URL}/graph`);
        return res.json();
    },

    chat: async (query: string, nodeName: string, history: { role: string, text: string }[]) => {
        const res = await fetch(`${API_BASE_URL}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query, node_name: nodeName, history }),
        });
        return res.json();
    },

    planQa: async (message: string, nodeName: string, history: { role: string; text: string }[]): Promise<PlanQAResponse> => {
        const res = await fetch(`${API_BASE_URL}/plan-qa`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message, node_name: nodeName, history }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Plan QA request failed");
        return data;
    },

    getNodeImages: async (nodeName: string) => {
        const res = await fetch(`${API_BASE_URL}/node/${encodeURIComponent(nodeName)}/images`);
        return res.json();
    }
};
