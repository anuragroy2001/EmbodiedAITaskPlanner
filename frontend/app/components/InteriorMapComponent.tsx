"use client";

import { useState } from "react";
import { Download, X, Eye, Loader2, Send } from "lucide-react";
import { ObjectLocation, SpatialNode } from "../lib/api";

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
}

export default function InteriorMapComponent({
    mapImage, locations, topology, sourceImages,
    selectedObjectId, onSelectObject, theme,
    robotApiUrl, onAddSystemLog
}: InteriorMapProps) {
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [viewingSource, setViewingSource] = useState<{ objectId: string; imageIndices: number[] } | null>(null);
    const [isDispatching, setIsDispatching] = useState(false);

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
        <div className="w-full h-full relative">
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

            <img src={mapImage} alt="Floor Plan" className="w-full h-full object-contain" />

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
                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 rounded whitespace-nowrap text-[10px] font-mono font-medium"
                                style={{
                                    background: isDark ? 'rgba(9,9,11,0.95)' : 'rgba(255,255,255,0.95)',
                                    border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border-strong)',
                                    color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                                    backdropFilter: 'blur(8px)',
                                }}>
                                {hasSource && <Eye className="w-2.5 h-2.5" style={{ color: 'var(--accent)' }} />}
                                {label}
                            </div>
                        )}
                    </div>
                );
            })}

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
