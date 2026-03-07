"""Pydantic models for the task planner layer."""

from enum import Enum
from typing import List, Dict, Optional
from pydantic import BaseModel


class RobotType(str, Enum):
    humanoid = "humanoid"
    quadruped = "quadruped"
    mobile_base = "mobile_base"


class PlannerRequest(BaseModel):
    node_name: str
    goal: str
    use_mock: bool = True
    robot_type: RobotType = RobotType.humanoid


class TaskLocation(BaseModel):
    x: float
    y: float
    label: Optional[str] = None


class Subtask(BaseModel):
    id: str
    action: str
    description: str
    objects: List[str] = []
    location: Optional[TaskLocation] = None
    duration_estimate_sec: Optional[float] = None
    depends_on: List[str] = []
    preconditions: List[str] = []
    success_criteria: List[str] = []


class DependencyGraph(BaseModel):
    nodes: List[str]
    edges: List[Dict[str, str]]


class PlannerTrace(BaseModel):
    mode: str
    model: str
    validation_passed: bool
    errors: List[str] = []


class PlannerOutput(BaseModel):
    task_id: str
    goal: str
    room: str
    subtasks: List[Subtask]
    dependency_graph: DependencyGraph
    warnings: List[str] = []
    planner_trace: Optional[PlannerTrace] = None
    execution_order: List[str] = []


class ValidationResult(BaseModel):
    valid: bool
    errors: List[str] = []
    warnings: List[str] = []
