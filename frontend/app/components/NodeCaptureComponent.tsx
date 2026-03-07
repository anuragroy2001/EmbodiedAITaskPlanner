"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Loader2, Camera, Upload, Plus, X, ArrowRight } from "lucide-react";
import { api, SpatialNode, ObjectLocation } from "../lib/api";

interface NodeCaptureProps {
    onGenerate: (topology: SpatialNode, mapImage: string, locations: ObjectLocation[]) => void;
}

const MIN_PHOTOS = 6;

function getRectLoopPositions(count: number, w: number, h: number, r: number, cx: number, cy: number) {
    const topLen = w - 2 * r;
    const rightLen = h - 2 * r;
    const bottomLen = w - 2 * r;
    const leftLen = h - 2 * r;
    const arcLen = (Math.PI / 2) * r;
    const perimeter = topLen + rightLen + bottomLen + leftLen + 4 * arcLen;

    const positions: { x: number; y: number }[] = [];
    const x0 = cx - w / 2;
    const y0 = cy - h / 2;

    for (let i = 0; i < count; i++) {
        let d = (i / count) * perimeter;
        let x: number, y: number;

        if (d < topLen) {
            x = x0 + r + d;
            y = y0;
        } else if ((d -= topLen) < arcLen) {
            const a = -Math.PI / 2 + (d / arcLen) * (Math.PI / 2);
            x = x0 + w - r + r * Math.cos(a);
            y = y0 + r + r * Math.sin(a);
        } else if ((d -= arcLen) < rightLen) {
            x = x0 + w;
            y = y0 + r + d;
        } else if ((d -= rightLen) < arcLen) {
            const a = 0 + (d / arcLen) * (Math.PI / 2);
            x = x0 + w - r + r * Math.cos(a);
            y = y0 + h - r + r * Math.sin(a);
        } else if ((d -= arcLen) < bottomLen) {
            x = x0 + w - r - d;
            y = y0 + h;
        } else if ((d -= bottomLen) < arcLen) {
            const a = Math.PI / 2 + (d / arcLen) * (Math.PI / 2);
            x = x0 + r + r * Math.cos(a);
            y = y0 + h - r + r * Math.sin(a);
        } else if ((d -= arcLen) < leftLen) {
            x = x0;
            y = y0 + h - r - d;
        } else {
            d -= leftLen;
            const a = Math.PI + (d / arcLen) * (Math.PI / 2);
            x = x0 + r + r * Math.cos(a);
            y = y0 + r + r * Math.sin(a);
        }

        positions.push({ x, y });
    }
    return positions;
}

export default function NodeCaptureComponent({ onGenerate }: NodeCaptureProps) {
    const [files, setFiles] = useState<(File | null)[]>(Array(8).fill(null));
    const [previews, setPreviews] = useState<(string | null)[]>(Array(8).fill(null));
    const [isUploading, setIsUploading] = useState(false);
    const [message, setMessage] = useState("");

    const uploadedCount = files.filter(f => f !== null).length;
    const totalSlots = files.length;

    useEffect(() => {
        const urls: (string | null)[] = files.map(f => f ? URL.createObjectURL(f) : null);
        setPreviews(urls);
        return () => { urls.forEach(u => { if (u) URL.revokeObjectURL(u); }); };
    }, [files]);

    const handleBatchFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const selected = Array.from(e.target.files).sort((a, b) => a.name.localeCompare(b.name));
            const newFiles: (File | null)[] = [];
            for (let i = 0; i < Math.max(totalSlots, selected.length); i++) {
                newFiles.push(selected[i] || null);
            }
            setFiles(newFiles);
        }
    };

    const handleSingleFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = [...files];
            newFiles[index] = e.target.files[0];
            setFiles(newFiles);
        }
    };

    const removeFile = (index: number) => {
        const newFiles = [...files];
        newFiles[index] = null;
        setFiles(newFiles);
    };

    const addSlot = () => {
        setFiles(prev => [...prev, null]);
    };

    const generate = useCallback(async () => {
        if (isUploading || uploadedCount < MIN_PHOTOS) return;
        setIsUploading(true);
        setMessage("");

        const nodeName = `room_${Date.now().toString(36)}`;
        const formData = new FormData();
        formData.append("node_name", nodeName);
        files.forEach((file) => { if (file) formData.append("images", file); });

        try {
            setMessage("Extracting topology...");
            const data = await api.uploadNode(formData);
            if (data.status === "success") {
                setMessage(data.message || "Analysis complete");
                if (data.topology && data.map_image) {
                    onGenerate(data.topology, data.map_image, data.locations || []);
                }
            } else {
                setMessage(data.detail || "Upload failed.");
            }
        } catch (err) {
            console.error(err);
            setMessage("Network error connecting to backend.");
        } finally {
            setIsUploading(false);
        }
    }, [files, isUploading, uploadedCount, onGenerate]);

    const SVG_W = 1800;
    const SVG_H = 900;
    const RECT_W = 1520;
    const RECT_H = 680;
    const CORNER_R = 100;
    const CX = SVG_W / 2;
    const CY = SVG_H / 2;

    const BOX_W = 170;
    const BOX_H = 270;

    const loopPositions = useMemo(() => {
        return getRectLoopPositions(totalSlots, RECT_W, RECT_H, CORNER_R, CX, CY);
    }, [totalSlots]);

    const blockArrows = useMemo(() => {
        const SHAFT_W = 14;
        const HEAD_W = 32;
        const HEAD_L = 28;
        const arrows: { points: string }[] = [];
        for (let i = 0; i < totalSlots; i++) {
            const from = loopPositions[i];
            const to = loopPositions[(i + 1) % totalSlots];
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const nx = dx / dist;
            const ny = dy / dist;
            const px = -ny;
            const py = nx;
            const gap = 155;
            const sx = from.x + nx * gap;
            const sy = from.y + ny * gap;
            const ex = to.x - nx * gap;
            const ey = to.y - ny * gap;
            const shaftEndX = ex - nx * HEAD_L;
            const shaftEndY = ey - ny * HEAD_L;
            const hw = SHAFT_W / 2;
            const hhw = HEAD_W / 2;
            const pts = [
                `${sx + px * hw},${sy + py * hw}`,
                `${shaftEndX + px * hw},${shaftEndY + py * hw}`,
                `${shaftEndX + px * hhw},${shaftEndY + py * hhw}`,
                `${ex},${ey}`,
                `${shaftEndX - px * hhw},${shaftEndY - py * hhw}`,
                `${shaftEndX - px * hw},${shaftEndY - py * hw}`,
                `${sx - px * hw},${sy - py * hw}`,
            ].join(' ');
            arrows.push({ points: pts });
        }
        return arrows;
    }, [loopPositions, totalSlots]);

    const canGenerate = uploadedCount >= MIN_PHOTOS && !isUploading;

    return (
        <div className="flex flex-col items-center gap-8 py-4 w-full">
            {/* Rectangular loop */}
            <div className="relative w-full" style={{ maxWidth: SVG_W, aspectRatio: `${SVG_W} / ${SVG_H}` }}>
                <svg
                    className="absolute inset-0 w-full h-full"
                    viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                    preserveAspectRatio="xMidYMid meet"
                    fill="none"
                >
                    {/* Faint track outline */}
                    <rect
                        x={CX - RECT_W / 2}
                        y={CY - RECT_H / 2}
                        width={RECT_W}
                        height={RECT_H}
                        rx={CORNER_R}
                        ry={CORNER_R}
                        stroke="rgba(255, 255, 255, 0.03)"
                        strokeWidth="1"
                        fill="none"
                    />

                    {blockArrows.map((arrow, i) => {
                        const fromFilled = !!files[i];
                        const toFilled = !!files[(i + 1) % totalSlots];
                        const active = fromFilled && toFilled;
                        return (
                            <polygon
                                key={i}
                                points={arrow.points}
                                fill={active ? "#ffffff" : "rgba(255, 255, 255, 0.35)"}
                                style={{
                                    transition: "fill 0.3s",
                                    filter: active
                                        ? "drop-shadow(0 0 8px rgba(255,255,255,1)) drop-shadow(0 0 24px rgba(255,255,255,0.6))"
                                        : "none",
                                }}
                            />
                        );
                    })}
                </svg>

                {/* Photo boxes */}
                {loopPositions.map((pos, i) => {
                    const filled = !!files[i];
                    const preview = previews[i];
                    const pctX = (pos.x / SVG_W) * 100;
                    const pctY = (pos.y / SVG_H) * 100;
                    const pctW = (BOX_W / SVG_W) * 100;
                    const pctH = (BOX_H / SVG_H) * 100;
                    return (
                        <div
                            key={i}
                            className="absolute flex flex-col items-center"
                            style={{
                                left: `${pctX - pctW / 2}%`,
                                top: `${pctY - pctH / 2}%`,
                                width: `${pctW}%`,
                                height: `${pctH + 3}%`,
                            }}
                        >
                            <label
                                className="relative rounded-2xl cursor-pointer transition-all duration-200 hover:scale-105 overflow-hidden flex items-center justify-center group w-full"
                                style={{
                                    aspectRatio: `${BOX_W} / ${BOX_H}`,
                                    border: filled
                                        ? "1.5px solid rgba(255, 255, 255, 0.25)"
                                        : "1.5px dashed rgba(255, 255, 255, 0.08)",
                                    background: filled
                                        ? "rgba(255, 255, 255, 0.05)"
                                        : "rgba(255, 255, 255, 0.015)",
                                    boxShadow: filled
                                        ? "0 2px 20px rgba(255, 255, 255, 0.05)"
                                        : "none",
                                }}
                            >
                                {preview ? (
                                    <>
                                        <img
                                            src={preview}
                                            alt={`Photo ${i + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                removeFile(i);
                                            }}
                                            className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                            style={{
                                                background: "rgba(0,0,0,0.7)",
                                                color: "#fff",
                                            }}
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </>
                                ) : (
                                    <Camera
                                        className="w-16 h-16"
                                        style={{ color: "rgba(255, 255, 255, 0.1)" }}
                                    />
                                )}
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => handleSingleFileChange(i, e)}
                                />
                            </label>
                            <span
                                className="text-[10px] font-mono font-semibold mt-1.5"
                                style={{
                                    color: filled
                                        ? "rgba(255, 255, 255, 0.45)"
                                        : "rgba(255, 255, 255, 0.12)",
                                }}
                            >
                                {i + 1}
                            </span>
                        </div>
                    );
                })}

                {/* Center label */}
                <div
                    className="absolute flex flex-col items-center justify-center text-center pointer-events-none"
                    style={{
                        left: "50%",
                        top: "50%",
                        transform: "translate(-50%, -50%)",
                        width: "16%",
                    }}
                >
                    <span
                        className="text-[10px] font-semibold uppercase tracking-[0.15em]"
                        style={{ color: "rgba(255, 255, 255, 0.1)" }}
                    >
                        Round Trip
                    </span>
                    <span
                        className="text-[22px] font-bold font-mono mt-1"
                        style={{ color: "rgba(255, 255, 255, 0.35)" }}
                    >
                        {uploadedCount}/{totalSlots}
                    </span>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                    <label
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl cursor-pointer text-[13px] font-semibold transition-all hover:scale-[1.02]"
                        style={{
                            background: "rgba(255, 255, 255, 0.05)",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            color: "rgba(255, 255, 255, 0.7)",
                        }}
                    >
                        <Upload className="w-4 h-4" />
                        Batch Upload
                        <input
                            type="file"
                            multiple
                            accept="image/*"
                            className="hidden"
                            onChange={handleBatchFileChange}
                        />
                    </label>

                    <button
                        onClick={addSlot}
                        className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all hover:scale-[1.02]"
                        style={{
                            background: "rgba(255, 255, 255, 0.03)",
                            border: "1px solid rgba(255, 255, 255, 0.06)",
                            color: "rgba(255, 255, 255, 0.35)",
                        }}
                    >
                        <Plus className="w-4 h-4" />
                        Add Stop
                    </button>
                </div>

                <button
                    onClick={generate}
                    disabled={!canGenerate}
                    className="flex items-center gap-2.5 px-7 py-3 rounded-2xl text-[15px] font-bold transition-all"
                    style={{
                        background: canGenerate ? "#ffffff" : "rgba(255, 255, 255, 0.04)",
                        color: canGenerate ? "#0c0c0c" : "rgba(255, 255, 255, 0.15)",
                        cursor: canGenerate ? "pointer" : "not-allowed",
                        boxShadow: canGenerate ? "0 4px 30px rgba(255, 255, 255, 0.12)" : "none",
                    }}
                >
                    {isUploading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {message || "Processing..."}
                        </>
                    ) : (
                        <>
                            Generate
                            <ArrowRight className="w-4 h-4" />
                        </>
                    )}
                </button>
            </div>

            {/* Progress bar */}
            <div className="w-full">
                <div
                    className="h-[3px] rounded-full overflow-hidden"
                    style={{ background: "rgba(255, 255, 255, 0.04)" }}
                >
                    <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                            width: `${(uploadedCount / totalSlots) * 100}%`,
                            background:
                                uploadedCount >= totalSlots
                                    ? "var(--success)"
                                    : "rgba(255, 255, 255, 0.35)",
                        }}
                    />
                </div>
            </div>

            {/* Status message */}
            {message && !isUploading && (
                <div
                    className="text-center text-[13px] font-mono"
                    style={{
                        color: message.toLowerCase().includes("error") || message.toLowerCase().includes("fail")
                            ? "var(--danger)"
                            : "var(--success)",
                    }}
                >
                    {message}
                </div>
            )}
        </div>
    );
}
