"use client";

import React, { useState, useEffect, useRef } from "react";
import * as d3 from "d3";
import { ChevronDown, ChevronRight, ListChecks, AlertTriangle, Info } from "lucide-react";
import type { PlannerOutput, PlanSummary, Subtask } from "../lib/api";

interface InteractivePlanViewProps {
    plan: PlannerOutput;
    planSummary?: PlanSummary | null;
}

const ORDER = (plan: PlannerOutput): string[] =>
    (plan.execution_order && plan.execution_order.length > 0)
        ? plan.execution_order
        : plan.subtasks.map((s) => s.id);

function SubtaskCard({ subtask, isExpanded, onToggle }: { subtask: Subtask; isExpanded: boolean; onToggle: () => void }) {
    const hasDetails =
        (subtask.objects?.length ?? 0) > 0 ||
        subtask.location != null ||
        (subtask.preconditions?.length ?? 0) > 0 ||
        (subtask.success_criteria?.length ?? 0) > 0;

    return (
        <div
            className="rounded-lg border transition-colors"
            style={{
                background: "var(--bg-secondary)",
                borderColor: "var(--border)",
            }}
        >
            <button
                type="button"
                onClick={hasDetails ? onToggle : undefined}
                className="w-full text-left px-3 py-2 flex items-start gap-2"
            >
                {hasDetails ? (
                    isExpanded ? (
                        <ChevronDown className="w-3 h-3 mt-0.5 shrink-0" style={{ color: "var(--text-muted)" }} />
                    ) : (
                        <ChevronRight className="w-3 h-3 mt-0.5 shrink-0" style={{ color: "var(--text-muted)" }} />
                    )
                ) : (
                    <span className="w-3 inline-block" />
                )}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[10px] font-bold" style={{ color: "var(--accent)" }}>
                            {subtask.id}
                        </span>
                        <span className="text-[11px] font-medium" style={{ color: "var(--text-primary)" }}>
                            {subtask.action}
                        </span>
                        {subtask.duration_estimate_sec != null && (
                            <span className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
                                ~{subtask.duration_estimate_sec}s
                            </span>
                        )}
                    </div>
                    <p className="text-[11px] mt-0.5 leading-snug" style={{ color: "var(--text-secondary)" }}>
                        {subtask.description}
                    </p>
                    {subtask.depends_on.length > 0 && (
                        <p className="font-mono text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                            after {subtask.depends_on.join(", ")}
                        </p>
                    )}
                </div>
            </button>
            {hasDetails && isExpanded && (
                <div
                    className="px-3 pb-3 pt-0 border-t space-y-2"
                    style={{ borderColor: "var(--border)" }}
                >
                    {subtask.objects?.length ? (
                        <div>
                            <span className="text-[10px] font-semibold uppercase" style={{ color: "var(--text-muted)" }}>Objects</span>
                            <p className="font-mono text-[11px]" style={{ color: "var(--text-primary)" }}>{subtask.objects.join(", ")}</p>
                        </div>
                    ) : null}
                    {subtask.location != null && (
                        <div>
                            <span className="text-[10px] font-semibold uppercase" style={{ color: "var(--text-muted)" }}>Location</span>
                            <p className="font-mono text-[11px]" style={{ color: "var(--text-primary)" }}>
                                {subtask.location.label ?? `(${subtask.location.x}, ${subtask.location.y})`}
                            </p>
                        </div>
                    )}
                    {subtask.preconditions?.length ? (
                        <div>
                            <span className="text-[10px] font-semibold uppercase" style={{ color: "var(--text-muted)" }}>Preconditions</span>
                            <ul className="list-disc list-inside text-[11px]" style={{ color: "var(--text-primary)" }}>
                                {subtask.preconditions.map((p, i) => (
                                    <li key={i}>{p}</li>
                                ))}
                            </ul>
                        </div>
                    ) : null}
                    {subtask.success_criteria?.length ? (
                        <div>
                            <span className="text-[10px] font-semibold uppercase" style={{ color: "var(--text-muted)" }}>Success criteria</span>
                            <ul className="list-disc list-inside text-[11px]" style={{ color: "var(--text-primary)" }}>
                                {subtask.success_criteria.map((s, i) => (
                                    <li key={i}>{s}</li>
                                ))}
                            </ul>
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
}

function DependencyGraphD3({ plan }: { plan: PlannerOutput }) {
    const svgRef = useRef<SVGSVGElement>(null);
    const { nodes: nodeIds, edges } = plan.dependency_graph;
    const width = 280;
    const height = 120;

    useEffect(() => {
        if (!svgRef.current || !nodeIds.length) return;

    // Draw "depends on": edge { source: "t2", target: "t1" } means t2 depends on t1 → show t1 → t2
        const links = edges.map((e) => ({ source: e.target, target: e.source }));
        const nodes = nodeIds.map((id) => ({ id, label: id }));

        d3.select(svgRef.current).selectAll("*").remove();

        const simulation = d3
            .forceSimulation(nodes as any)
            .force(
                "link",
                d3.forceLink(links).id((d: any) => d.id).distance(50)
            )
            .force("charge", d3.forceManyBody().strength(-180))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collide", d3.forceCollide().radius(20));

        const svg = d3.select(svgRef.current).attr("viewBox", [0, 0, width, height]);
        const g = svg.append("g");

        const link = g
            .append("g")
            .selectAll("line")
            .data(links)
            .join("line")
            .attr("stroke", "var(--border)")
            .attr("stroke-width", 1);

        const node = g
            .append("g")
            .selectAll("g")
            .data(nodes)
            .join("g")
            .attr("cursor", "default");

        node.append("rect")
            .attr("width", 28)
            .attr("height", 18)
            .attr("x", -14)
            .attr("y", -9)
            .attr("rx", 3)
            .attr("fill", "var(--accent-dim)")
            .attr("stroke", "var(--accent)")
            .attr("stroke-width", 1);

        node.append("text")
            .text((d: any) => d.label)
            .attr("text-anchor", "middle")
            .attr("dy", 4)
            .attr("font-family", "monospace")
            .attr("font-size", "9px")
            .attr("fill", "var(--text-primary)");

        simulation.on("tick", () => {
            link
                .attr("x1", (d: any) => d.source.x)
                .attr("y1", (d: any) => d.source.y)
                .attr("x2", (d: any) => d.target.x)
                .attr("y2", (d: any) => d.target.y);
            node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
        });

        return () => {
            simulation.stop();
        };
    }, [plan.dependency_graph]);

    if (nodeIds.length === 0) return null;

    return (
        <div className="rounded-lg overflow-hidden" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
            <p className="text-[10px] font-semibold px-2 py-1" style={{ color: "var(--text-muted)" }}>
                Task dependencies
            </p>
            <svg ref={svgRef} width="100%" height={height} style={{ display: "block" }} />
        </div>
    );
}

export default function InteractivePlanView({ plan, planSummary }: InteractivePlanViewProps) {
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [showWarnings, setShowWarnings] = useState(false);
    const [showTrace, setShowTrace] = useState(false);

    const summary = planSummary ?? {
        goal: plan.goal,
        room: plan.room,
        subtask_count: plan.subtasks.length,
        dependency_count: plan.dependency_graph.edges.length,
    };

    const order = ORDER(plan);
    const subtaskMap = new Map(plan.subtasks.map((s) => [s.id, s]));

    const toggleExpanded = (id: string) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const hasWarnings = (plan.warnings?.length ?? 0) > 0;
    const hasTrace = plan.planner_trace != null;

    return (
        <div
            className="rounded-lg p-3 animate-fade-in flex flex-col gap-3"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
        >
            <div className="flex items-center gap-2">
                <ListChecks className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--accent)" }} />
                <span className="text-[12px] font-bold" style={{ color: "var(--text-primary)" }}>
                    {summary.goal}
                </span>
            </div>
            <p className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
                {summary.room} · {summary.subtask_count} subtasks, {summary.dependency_count} dependencies
            </p>

            {order.length > 0 && (
                <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase" style={{ color: "var(--text-muted)" }}>
                        Execution order
                    </p>
                    <div className="flex flex-wrap gap-1">
                        {order.map((id, i) => (
                            <span
                                key={id}
                                className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                                style={{
                                    background: "var(--accent-dim)",
                                    color: "var(--accent)",
                                    border: "1px solid var(--border)",
                                }}
                            >
                                {i + 1}. {id}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {plan.dependency_graph.nodes.length > 0 && (
                <DependencyGraphD3 plan={plan} />
            )}

            <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase" style={{ color: "var(--text-muted)" }}>
                    Subtasks
                </p>
                <div className="space-y-2 max-h-[240px] overflow-y-auto">
                    {order.map((id) => {
                        const st = subtaskMap.get(id);
                        if (!st) return null;
                        return (
                            <SubtaskCard
                                key={st.id}
                                subtask={st}
                                isExpanded={expandedIds.has(st.id)}
                                onToggle={() => toggleExpanded(st.id)}
                            />
                        );
                    })}
                </div>
            </div>

            {hasWarnings && (
                <div className="rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--bg-primary)" }}>
                    <button
                        type="button"
                        onClick={() => setShowWarnings(!showWarnings)}
                        className="w-full px-2 py-1.5 flex items-center gap-1.5 text-left"
                    >
                        <AlertTriangle className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
                        <span className="text-[10px] font-semibold" style={{ color: "var(--text-muted)" }}>
                            Warnings ({plan.warnings!.length})
                        </span>
                    </button>
                    {showWarnings && (
                        <ul className="px-2 pb-2 text-[11px] list-disc list-inside" style={{ color: "var(--text-secondary)" }}>
                            {plan.warnings!.map((w, i) => (
                                <li key={i}>{w}</li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {hasTrace && (
                <div className="rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--bg-primary)" }}>
                    <button
                        type="button"
                        onClick={() => setShowTrace(!showTrace)}
                        className="w-full px-2 py-1.5 flex items-center gap-1.5 text-left"
                    >
                        <Info className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
                        <span className="text-[10px] font-semibold" style={{ color: "var(--text-muted)" }}>
                            Planner trace
                        </span>
                    </button>
                    {showTrace && plan.planner_trace && (
                        <div className="px-2 pb-2 font-mono text-[10px] space-y-0.5" style={{ color: "var(--text-muted)" }}>
                            <p>mode: {plan.planner_trace.mode} · model: {plan.planner_trace.model}</p>
                            <p>validation_passed: {String(plan.planner_trace.validation_passed)}</p>
                            {plan.planner_trace.errors?.length ? (
                                <p style={{ color: "var(--danger)" }}>errors: {plan.planner_trace.errors.join("; ")}</p>
                            ) : null}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
