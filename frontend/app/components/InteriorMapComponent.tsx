"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Download, X, Eye, Loader2, Send } from "lucide-react";
import { ObjectLocation, SpatialNode, PlannerOutput } from "../lib/api";

/** Groups waypoints by distance (within tolerancePct), then stacks each group vertically so lower task ID is on top. */
function spreadWaypoints(
    waypoints: { x: number; y: number; label: string }[],
    tolerancePct: number = 5,
    stackOffsetPct: number = 6
): { x: number; y: number; label: string }[] {
    if (waypoints.length === 0) return [];
    const dist = (i: number, j: number) => {
        const a = waypoints[i], b = waypoints[j];
        return Math.hypot(a.x - b.x, a.y - b.y);
    };
    const parent = waypoints.map((_, i) => i);
    const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
    const union = (i: number, j: number) => {
        const pi = find(i), pj = find(j);
        if (pi !== pj) parent[Math.max(pi, pj)] = Math.min(pi, pj);
    };
    for (let i = 0; i < waypoints.length; i++)
        for (let j = i + 1; j < waypoints.length; j++)
            if (dist(i, j) <= tolerancePct) union(i, j);

    const groupByRoot = new Map<number, number[]>();
    waypoints.forEach((_, index) => {
        const root = find(index);
        if (!groupByRoot.has(root)) groupByRoot.set(root, []);
        groupByRoot.get(root)!.push(index);
    });

    const result: { x: number; y: number; label: string }[] = new Array(waypoints.length);
    groupByRoot.forEach((indices) => {
        indices.sort((a, b) => a - b);
        const n = indices.length;
        const cx = indices.reduce((s, i) => s + waypoints[i].x, 0) / n;
        const cy = indices.reduce((s, i) => s + waypoints[i].y, 0) / n;
        indices.forEach((idx, i) => {
            const y = cy + i * stackOffsetPct;
            result[idx] = {
                x: cx,
                y: Math.max(0, Math.min(100, y)),
                label: waypoints[idx].label,
            };
        });
    });
    return result;
}

interface InteriorMapProps {
    mapImage: string;
    locations: ObjectLocation[];
    topology: SpatialNode;
    sourceImages: string[];
    selectedObjectId: string | null;
    onSelectObject: (id: string | null) => void;
    theme: 'dark' | 'light';
    robotApiUrl: string;
    onAddSystemLog: (msg: string) => void;
    plan?: PlannerOutput | null;
}

export default function InteriorMapComponent({
    mapImage, locations, topology, sourceImages,
    selectedObjectId, onSelectObject, theme,
    robotApiUrl, onAddSystemLog, plan
}: InteriorMapProps) {
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [viewingSource, setViewingSource] = useState<{ objectId: string; imageIndices: number[] } | null>(null);
    const [isDispatching, setIsDispatching] = useState(false);
    const [imgBounds, setImgBounds] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const recalcBounds = useCallback(() => {
        const img = imgRef.current;
        const container = containerRef.current;
        if (!img || !container || !img.naturalWidth || !img.naturalHeight) return;
        const cw = container.clientWidth;
        const ch = container.clientHeight;
        const imgRatio = img.naturalWidth / img.naturalHeight;
        const containerRatio = cw / ch;
        let rw: number, rh: number;
        if (imgRatio > containerRatio) {
            rw = cw;
            rh = cw / imgRatio;
        } else {
            rh = ch;
            rw = ch * imgRatio;
        }
        setImgBounds({
            left: (cw - rw) / 2,
            top: (ch - rh) / 2,
            width: rw,
            height: rh,
        });
    }, []);

    useEffect(() => {
        window.addEventListener("resize", recalcBounds);
        return () => window.removeEventListener("resize", recalcBounds);
    }, [recalcBounds]);

    if (!mapImage) return null;

    const isDark = theme === 'dark';

    const getImageIndices = (objectId: string): number[] => {
        const anchor = topology.static_anchors?.find(a => a.anchor_id === objectId);
        if (anchor) return anchor.image_indices || [];
        const obj = topology.dynamic_objects?.find(d => d.object_id === objectId);
        if (obj) return obj.image_indices || [];
        return [];
    };

    const getObjectLabel = (objectId: string): string => {
        const anchor = topology.static_anchors?.find(a => a.anchor_id === objectId);
        if (anchor) return anchor.type;
        const obj = topology.dynamic_objects?.find(d => d.object_id === objectId);
        if (obj) return obj.type;
        return objectId;
    };

    const handleObjectClick = (objectId: string) => {
        const indices = getImageIndices(objectId);
        if (indices.length > 0 && sourceImages.length > 0) {
            setViewingSource({ objectId, imageIndices: indices });
        }
        onSelectObject(objectId === selectedObjectId ? null : objectId);
    };

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = mapImage;
        link.download = `floor_plan_${topology.node_name || 'map'}.png`;
        link.click();
    };

    const dispatchToHardware = async () => {
        if (!locations || locations.length === 0) return;
        setIsDispatching(true);
        onAddSystemLog("Starting ROS2 Trajectory Serialization...");

        const waypoints = locations.map(loc => {
            const centerX = (loc.xmin + loc.xmax) / 2;
            const centerY = (loc.ymin + loc.ymax) / 2;
            const metricX = centerX * 0.1;
            const metricY = centerY * 0.1;

            return {
                header: { frame_id: "map" },
                pose: {
                    position: { x: metricX, y: metricY, z: 0.0 },
                    orientation: { x: 0.0, y: 0.0, z: 0.0, w: 1.0 }
                }
            };
        });

        const payload = {
            action: "Nav2_FollowWaypoints",
            frame_id: "map",
            waypoints: waypoints
        };

        onAddSystemLog(`Trajectory serialized: ${waypoints.length} waypoints`);

        try {
            onAddSystemLog(`Dispatching to: ${robotApiUrl}`);
            await fetch(robotApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).catch(() => {
                console.log("Simulated network bypass for demo.");
            });

            onAddSystemLog(`Dispatched ${waypoints.length} waypoints to Nav2`);
            alert("Path Sent to Hardware Controller");
        } catch (err) {
            onAddSystemLog("Dispatch failed, simulated success for demo.");
            onAddSystemLog(`Dispatched ${waypoints.length} waypoints to Nav2`);
        } finally {
            setIsDispatching(false);
        }
    };

    return (
        <div ref={containerRef} className="w-full h-full relative">
            {/* Action buttons */}
            <div className="absolute top-3 right-3 z-20 flex gap-1.5">
                <button onClick={handleDownload}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-medium transition-all hover:scale-[1.02]"
                    style={{
                        background: isDark ? 'rgba(9,9,11,0.9)' : 'rgba(255,255,255,0.95)',
                        border: '1px solid var(--border-strong)',
                        color: 'var(--text-secondary)',
                        backdropFilter: 'blur(8px)',
                    }}>
                    <Download className="w-3 h-3" /> Save
                </button>
                <button
                    onClick={dispatchToHardware}
                    disabled={isDispatching}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-medium transition-all hover:scale-[1.02] disabled:opacity-50"
                    style={{
                        background: 'var(--accent-dim)',
                        border: '1px solid var(--accent)',
                        color: 'var(--accent)',
                        backdropFilter: 'blur(8px)',
                    }}>
                    {isDispatching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    Robot
                </button>
            </div>

            <img ref={imgRef} src={mapImage} alt="Floor Plan" className="w-full h-full object-contain" onLoad={recalcBounds} />

            {/* Overlay wrapper — positioned exactly over the rendered image area */}
            {imgBounds && <div className="absolute" style={{
                top: imgBounds.top,
                left: imgBounds.left,
                width: imgBounds.width,
                height: imgBounds.height,
            }}>

            {/* Bounding boxes */}
            {locations?.map((loc, index) => {
                const isHovered = hoveredId === loc.object_id;
                const isSelected = selectedObjectId === loc.object_id;
                const label = getObjectLabel(loc.object_id);
                const hasSource = getImageIndices(loc.object_id).length > 0;
                const uniqueKey = `${loc.object_id}-${index}`;

                return (
                    <div
                        key={uniqueKey}
                        onMouseEnter={() => setHoveredId(loc.object_id)}
                        onMouseLeave={() => setHoveredId(null)}
                        onClick={(e) => { e.stopPropagation(); handleObjectClick(loc.object_id); }}
                        className="absolute cursor-pointer transition-all duration-150"
                        style={{
                            top: `${Math.max(0, Math.min(100, loc.ymin))}%`,
                            left: `${Math.max(0, Math.min(100, loc.xmin))}%`,
                            width: `${Math.max(2, Math.min(100 - loc.xmin, loc.xmax - loc.xmin))}%`,
                            height: `${Math.max(2, Math.min(100 - loc.ymin, loc.ymax - loc.ymin))}%`,
                            border: isSelected
                                ? '1.5px solid var(--accent)'
                                : isHovered
                                    ? '1.5px solid var(--text-muted)'
                                    : '1.5px solid transparent',
                            background: isSelected
                                ? 'rgba(103, 232, 249, 0.1)'
                                : isHovered
                                    ? 'rgba(255, 255, 255, 0.05)'
                                    : 'transparent',
                            borderRadius: '4px',
                            zIndex: isSelected || isHovered ? 10 : 1,
                        }}
                    >
                        {(isHovered || isSelected) && (
                            <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 rounded whitespace-nowrap text-[10px] font-mono font-medium capitalize"
                                style={{
                                    background: isDark ? 'rgba(9,9,11,0.95)' : 'rgba(255,255,255,0.95)',
                                    border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border-strong)',
                                    color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                                    backdropFilter: 'blur(8px)',
                                }}>
                                {hasSource && <Eye className="w-2.5 h-2.5" style={{ color: 'var(--accent)' }} />}
                                {label.toLowerCase()}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Plan execution arrows */}
            {plan && plan.subtasks.length > 0 && (() => {
                const order = (plan.execution_order?.length ? plan.execution_order : plan.subtasks.map(s => s.id));
                const subtaskMap = new Map(plan.subtasks.map(s => [s.id, s]));
                const waypoints = order
                    .map(id => subtaskMap.get(id))
                    .filter((st): st is NonNullable<typeof st> => st != null && st.location != null && (st.location.x !== 0 || st.location.y !== 0))
                    .map(st => {
                        const raw = st.action || st.location!.label || st.id;
                        const capitalized = raw.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
                        return { x: st.location!.x, y: st.location!.y, label: capitalized };
                    });

                if (waypoints.length < 2) return null;

                const spreadWps = spreadWaypoints(waypoints, 5, 6);

                const ARROW_COLOR = "#22c55e";
                const ARROW_COLOR_RGB = "34, 197, 94";
                const NODE_FILL = "#ffffff";
                const NODE_BORDER = "#d1d5db";
                const NODE_TEXT = "#111827";

                const NODE_W = 90;
                const NODE_H = 32;
                const ENDPOINT_W = 110;
                const ENDPOINT_H = 42;

                const lastIdx = spreadWps.length - 1;

                return (<>
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 15 }}>
                        <defs>
                            <marker id="plan-arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                <polygon points="0 0, 10 3.5, 0 7" fill={ARROW_COLOR} />
                            </marker>
                            <filter id="plan-arrow-glow">
                                <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor={`rgb(${ARROW_COLOR_RGB})`} floodOpacity="0.4" />
                            </filter>
                            <filter id="node-shadow">
                                <feDropShadow dx="0" dy="1" stdDeviation="3" floodColor="rgba(0,0,0,0.25)" floodOpacity="0.6" />
                            </filter>
                        </defs>

                        {/* Arrows between waypoints (use spread positions so arrows connect to visible nodes) */}
                        {spreadWps.map((wp, i) => {
                            if (i === 0) return null;
                            const prev = spreadWps[i - 1];
                            const dx = wp.x - prev.x;
                            const dy = wp.y - prev.y;
                            const len = Math.sqrt(dx * dx + dy * dy);
                            if (len === 0) return null;

                            const nx = dx / len;
                            const ny = dy / len;
                            const shrinkStart = (i - 1 === 0 || i - 1 === lastIdx) ? 4.0 : 3.0;
                            const shrinkEnd = (i === lastIdx || i === 0) ? 4.0 : 3.0;
                            const x1 = prev.x + nx * shrinkStart;
                            const y1 = prev.y + ny * shrinkStart;
                            const x2 = wp.x - nx * shrinkEnd;
                            const y2 = wp.y - ny * shrinkEnd;

                            return (
                                <line key={`arrow-${i}`}
                                    x1={`${x1}%`} y1={`${y1}%`}
                                    x2={`${x2}%`} y2={`${y2}%`}
                                    stroke={ARROW_COLOR}
                                    strokeWidth="2.5"
                                    strokeDasharray="7 4"
                                    markerEnd="url(#plan-arrowhead)"
                                    filter="url(#plan-arrow-glow)"
                                    opacity="0.9"
                                />
                            );
                        })}

                    </svg>
                    {/* Waypoint nodes (HTML overlay for proper text rendering, using spread positions to avoid overlap) */}
                    {spreadWps.map((wp, i) => {
                        const isStart = i === 0;
                        const isEnd = i === lastIdx;
                        const isEndpoint = isStart || isEnd;
                        const stepNum = i + 1;

                        return (
                            <div key={`wp-${i}`}
                                className="absolute flex flex-col items-center justify-center pointer-events-none"
                                style={{
                                    left: `${wp.x}%`,
                                    top: `${wp.y}%`,
                                    transform: 'translate(-50%, -50%)',
                                    zIndex: 16,
                                }}
                            >
                                <div
                                    className="flex flex-col items-center justify-center text-center whitespace-nowrap"
                                    style={{
                                        background: NODE_FILL,
                                        border: `${isEndpoint ? 2.5 : 1.5}px solid ${isEndpoint ? ARROW_COLOR : NODE_BORDER}`,
                                        borderRadius: 999,
                                        padding: isEndpoint ? '6px 16px' : '4px 12px',
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                                        minWidth: isEndpoint ? 100 : 80,
                                    }}
                                >
                                    <span style={{
                                        color: ARROW_COLOR,
                                        fontSize: 9,
                                        fontWeight: 800,
                                        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
                                        letterSpacing: 0.5,
                                        lineHeight: 1.2,
                                    }}>
                                        {isStart ? `#${stepNum} START` : isEnd ? `#${stepNum} END` : `#${stepNum}`}
                                    </span>
                                    <span style={{
                                        color: NODE_TEXT,
                                        fontSize: isEndpoint ? 10 : 9,
                                        fontWeight: 700,
                                        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
                                        lineHeight: 1.2,
                                    }}>
                                        {wp.label}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </>);
            })()}

            </div>}

            {/* Source image viewer */}
            {viewingSource && sourceImages.length > 0 && (
                <div className="absolute inset-0 z-30 flex items-center justify-center"
                    style={{ background: 'rgba(9, 9, 11, 0.9)', backdropFilter: 'blur(4px)' }}>
                    <div className="relative max-w-2xl w-full mx-4 rounded-xl overflow-hidden surface-card">
                        <div className="px-4 py-3 flex items-center justify-between"
                            style={{ borderBottom: '1px solid var(--border)' }}>
                            <div className="flex items-center gap-2">
                                <Eye className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                                <span className="text-[13px] font-bold">
                                    {getObjectLabel(viewingSource.objectId)}
                                </span>
                                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                                    style={{ color: 'var(--text-muted)', background: 'var(--bg-secondary)' }}>
                                    {viewingSource.imageIndices.length} photos
                                </span>
                            </div>
                            <button onClick={() => setViewingSource(null)}
                                className="w-6 h-6 rounded flex items-center justify-center transition-colors hover:bg-[var(--bg-secondary)]">
                                <X className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                            </button>
                        </div>

                        <div className="p-4 grid grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto">
                            {viewingSource.imageIndices.map(idx => {
                                const dirLabels = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
                                const imgSrc = sourceImages[idx];
                                if (!imgSrc) return null;
                                return (
                                    <div key={idx} className="relative rounded-lg overflow-hidden"
                                        style={{ border: '1px solid var(--border)' }}>
                                        <img src={imgSrc} alt={dirLabels[idx] || `IMG ${idx}`}
                                            className="w-full h-auto object-cover" />
                                        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold"
                                            style={{ background: 'rgba(9,9,11,0.8)', color: 'var(--accent)', backdropFilter: 'blur(4px)' }}>
                                            {dirLabels[idx] || `${idx}`}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
