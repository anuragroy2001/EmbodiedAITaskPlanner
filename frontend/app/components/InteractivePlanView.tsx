"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight, ListChecks, AlertTriangle, Package, MapPin, CheckSquare, Flag } from "lucide-react";
import type { PlannerOutput, PlanSummary, Subtask } from "../lib/api";

/** Display label for task ID: t1/T1 -> "Task 1", task_1/step_2 -> "Task 1"/"Task 2", else capitalize first letter. */
export function formatTaskId(id: string): string {
    if (!id) return id;
    const trimmed = id.trim();
    const tMatch = /^t(\d+)$/i.exec(trimmed);
    if (tMatch) return `Task ${tMatch[1]}`;
    const prefixMatch = /^(?:task_|step_)(\d+)$/i.exec(trimmed);
    if (prefixMatch) return `Task ${prefixMatch[1]}`;
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/** Display label for action: replace underscores with spaces, capitalize first letter. */
export function formatAction(action: string): string {
    if (!action) return action;
    const withSpaces = action.replace(/_/g, " ");
    return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

/** Display label for item IDs (objects, locations): same as action – underscores to spaces, capitalize. */
export function formatItemId(id: string): string {
    return formatAction(id);
}

interface InteractivePlanViewProps {
    plan: PlannerOutput;
    planSummary?: PlanSummary | null;
}

const ORDER = (plan: PlannerOutput): string[] =>
    (plan.execution_order && plan.execution_order.length > 0)
        ? plan.execution_order
        : plan.subtasks.map((s) => s.id);

function SubtaskCard({ subtask, isExpanded, onToggle, stepIndex }: { subtask: Subtask; isExpanded: boolean; onToggle: () => void; stepIndex: number }) {
    const hasDetails =
        (subtask.objects?.length ?? 0) > 0 ||
        subtask.location != null ||
        (subtask.preconditions?.length ?? 0) > 0 ||
        (subtask.success_criteria?.length ?? 0) > 0;

    const objectsList = (subtask.objects ?? []).map(formatItemId);
    const isSingleObjectSameAsLocation =
        (subtask.objects?.length ?? 0) === 1 &&
        subtask.location?.label != null &&
        subtask.objects![0] === subtask.location.label;

    return (
        <div
            className="rounded-lg transition-colors duration-200 hover:[border-top-color:var(--border-strong)] hover:[border-right-color:var(--border-strong)] hover:[border-bottom-color:var(--border-strong)] hover:[border-left-color:var(--border-strong)] hover:bg-[var(--bg-elevated)] animate-fade-in"
            style={{
                background: "var(--bg-elevated)",
                borderTopWidth: "1px",
                borderRightWidth: "1px",
                borderBottomWidth: "1px",
                borderLeftWidth: "2px",
                borderTopStyle: "solid",
                borderRightStyle: "solid",
                borderBottomStyle: "solid",
                borderLeftStyle: "solid",
                borderTopColor: "var(--border)",
                borderRightColor: "var(--border)",
                borderBottomColor: "var(--border)",
                borderLeftColor: "var(--accent)",
                animationFillMode: "both",
                animationDelay: `${(stepIndex - 1) * 0.05}s`,
            }}
        >
            <button
                type="button"
                onClick={hasDetails ? onToggle : undefined}
                className="w-full text-left px-3 py-2.5 flex items-start gap-2"
                style={{ background: "var(--bg-subtask-inner)" }}
            >
                {hasDetails ? (
                    isExpanded ? (
                        <ChevronDown className="w-3 h-3 mt-0.5 shrink-0 transition-transform duration-200" style={{ color: "var(--text-muted)" }} />
                    ) : (
                        <ChevronRight className="w-3 h-3 mt-0.5 shrink-0 transition-transform duration-200" style={{ color: "var(--text-muted)" }} />
                    )
                ) : (
                    <span className="min-w-[1.25rem] inline-flex items-center justify-center font-mono text-[10px] font-medium shrink-0" style={{ color: "var(--text-muted)" }}>
                        {stepIndex}
                    </span>
                )}
                    <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px] font-bold" style={{ color: "var(--accent)" }}>
                            {formatTaskId(subtask.id)}
                        </span>
                        <span className="text-[12px] font-medium" style={{ color: "var(--text-primary)" }}>
                            {formatAction(subtask.action)}
                        </span>
                        {(subtask.objects?.length ?? 0) > 0 && !isSingleObjectSameAsLocation && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium"
                                style={{ background: "var(--accent-dim)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                                <Package className="w-2.5 h-2.5" />
                                {objectsList.join(", ")}
                            </span>
                        )}
                        {subtask.location != null && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium"
                                style={{ background: "var(--accent-dim)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                                <MapPin className="w-2.5 h-2.5" />
                                {isSingleObjectSameAsLocation
                                    ? `${objectsList[0]}`
                                    : formatItemId(subtask.location.label ?? `(${Math.round(subtask.location.x)}, ${Math.round(subtask.location.y)})`)}
                            </span>
                        )}
                        {subtask.duration_estimate_sec != null && (
                            <span className="font-mono text-[11px]" style={{ color: "var(--text-muted)" }}>
                                ~{subtask.duration_estimate_sec}s
                            </span>
                        )}
                    </div>
                    <p className="text-[12px] mt-0.5 leading-snug" style={{ color: "var(--text-secondary)" }}>
                        {subtask.description}
                    </p>
                    {subtask.depends_on.length > 0 && (
                        <p className="font-mono text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
                            after {subtask.depends_on.map(formatTaskId).join(", ")}
                        </p>
                    )}
                </div>
            </button>
            {hasDetails && isExpanded && (
                <div
                    className="px-3 pb-3 pt-0 border-t space-y-3 transition-all duration-200"
                    style={{ borderColor: "var(--border)" }}
                >
                    {(subtask.objects?.length ?? 0) > 0 && (
                        <div className="flex gap-2 items-start">
                            <Package className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: "var(--accent)" }} />
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>
                                    {isSingleObjectSameAsLocation ? "Object & location" : "Objects"}
                                </p>
                                <p className="text-[13px]" style={{ color: "var(--text-primary)" }}>
                                    {objectsList.join(", ")}
                                </p>
                            </div>
                        </div>
                    )}
                    {subtask.location != null && !isSingleObjectSameAsLocation && (
                        <div className="flex gap-2 items-start">
                            <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: "var(--accent)" }} />
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>Location</p>
                                <p className="text-[13px]" style={{ color: "var(--text-primary)" }}>
                                    {subtask.location.label != null ? formatItemId(subtask.location.label) : `(${subtask.location.x}, ${subtask.location.y})`}
                                </p>
                            </div>
                        </div>
                    )}
                    {(subtask.preconditions?.length ?? 0) > 0 && (
                        <div className="flex gap-2 items-start">
                            <CheckSquare className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: "var(--accent)" }} />
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>Preconditions</p>
                                <ul className="list-disc list-inside text-[13px] space-y-0.5" style={{ color: "var(--text-primary)" }}>
                                    {subtask.preconditions!.map((p, i) => (
                                        <li key={i}>{p}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                    {(subtask.success_criteria?.length ?? 0) > 0 && (
                        <div className="flex gap-2 items-start">
                            <Flag className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: "var(--accent)" }} />
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>Success criteria</p>
                                <ul className="list-disc list-inside text-[13px] space-y-0.5" style={{ color: "var(--text-primary)" }}>
                                    {subtask.success_criteria!.map((s, i) => (
                                        <li key={i}>{s}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function InteractivePlanView({ plan, planSummary }: InteractivePlanViewProps) {
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [showWarnings, setShowWarnings] = useState(false);

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

    return (
        <div
            className="rounded-lg overflow-hidden animate-fade-in flex flex-col"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
        >
            {/* Goal block */}
            <div
                className="flex items-center gap-2 py-3 px-3"
                style={{ background: "var(--bg-elevated)", borderBottom: "1px solid var(--border)" }}
            >
                <ListChecks className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--accent)" }} />
                <span className="text-[14px] font-semibold" style={{ color: "var(--text-primary)" }}>
                    {summary.goal}
                </span>
            </div>

            <div className="p-3 flex flex-col gap-3">
            <div className="space-y-2.5 pt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                    Subtasks
                </p>
                <div className="space-y-2.5 min-h-[200px] max-h-[280px] overflow-y-auto">
                    {order.map((id, index) => {
                        const st = subtaskMap.get(id);
                        if (!st) return null;
                        return (
                            <SubtaskCard
                                key={st.id}
                                subtask={st}
                                stepIndex={index + 1}
                                isExpanded={expandedIds.has(st.id)}
                                onToggle={() => toggleExpanded(st.id)}
                            />
                        );
                    })}
                </div>
            </div>

            {hasWarnings && (
                <div
                    className="rounded-lg border transition-colors duration-200 hover:border-[var(--border-strong)]"
                    style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}
                >
                    <button
                        type="button"
                        onClick={() => setShowWarnings(!showWarnings)}
                        className="w-full px-3 py-3 flex items-center gap-1.5 text-left"
                    >
                        <AlertTriangle className="w-3 h-3 shrink-0" style={{ color: "var(--text-muted)" }} />
                        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                            Warnings ({plan.warnings!.length})
                        </span>
                    </button>
                    {showWarnings && (
                        <ul className="px-3 pb-3 text-[12px] list-disc list-inside space-y-0.5" style={{ color: "var(--text-secondary)" }}>
                            {plan.warnings!.map((w, i) => (
                                <li key={i}>{w}</li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
            </div>
        </div>
    );
}
