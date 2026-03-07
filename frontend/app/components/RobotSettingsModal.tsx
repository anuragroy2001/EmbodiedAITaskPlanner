"use client";

import { useState } from "react";
import { X, Save } from "lucide-react";

interface RobotSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    apiUrl: string;
    onSave: (url: string) => void;
}

export default function RobotSettingsModal({ isOpen, onClose, apiUrl, onSave }: RobotSettingsModalProps) {
    const [url, setUrl] = useState(apiUrl);

    if (!isOpen) return null;

    const handleSave = () => {
        onSave(url);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(9, 9, 11, 0.7)', backdropFilter: 'blur(4px)' }}>
            <div className="w-full max-w-md mx-4 rounded-2xl overflow-hidden surface-card animate-fade-in">
                <div className="px-5 py-3 flex items-center justify-between"
                    style={{ borderBottom: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent-warm)' }} />
                        <h3 className="text-[14px] font-bold">Robot Configuration</h3>
                    </div>
                    <button onClick={onClose}
                        className="w-6 h-6 rounded flex items-center justify-center transition-colors hover:bg-[var(--bg-secondary)]">
                        <X className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                    </button>
                </div>

                <div className="p-5 flex flex-col gap-4">
                    <div>
                        <label className="block text-[12px] font-semibold mb-2"
                            style={{ color: 'var(--text-muted)' }}>
                            Nav2 API Endpoint
                        </label>
                        <input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            className="w-full rounded-lg px-3 py-2.5 font-mono text-[13px] transition-all"
                            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                            placeholder="http://localhost:8080/nav2/follow_waypoints"
                        />
                    </div>

                    <div className="rounded-lg p-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                        <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                            Receives Nav2 <code className="font-mono px-1 py-0.5 rounded text-[11px]"
                                style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                                FollowWaypoints
                            </code> payloads with PoseStamped waypoints from the 2D map.
                        </p>
                    </div>
                </div>

                <div className="px-5 py-3 flex justify-end gap-2" style={{ borderTop: '1px solid var(--border)' }}>
                    <button onClick={onClose}
                        className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
                        style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                        Cancel
                    </button>
                    <button onClick={handleSave}
                        className="px-3 py-1.5 rounded-lg text-[12px] font-medium flex items-center gap-1.5 transition-all"
                        style={{ background: 'var(--accent)', color: '#09090B' }}>
                        <Save className="w-3 h-3" />
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}
