"use client";

import { useState, useRef, useEffect } from "react";
import { Terminal, Send, MessageSquare, Loader2, ListChecks } from "lucide-react";
import { api, SpatialNode, PlannerOutput } from "../lib/api";

interface CommandBarProps {
    topology: SpatialNode | null;
    systemLogs: string[];
}

export default function CommandBarComponent({ topology, systemLogs }: CommandBarProps) {
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model', text: string }[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [isChatting, setIsChatting] = useState(false);
    const [showTerminal, setShowTerminal] = useState(false);
    const [latestPlan, setLatestPlan] = useState<PlannerOutput | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const terminalEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (terminalEndRef.current) {
            terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [systemLogs, showTerminal]);

    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatHistory, isChatting]);

    const handleChatSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim() || !topology || isChatting) return;

        const userMsg = chatInput.trim();
        setChatInput('');
        const newHistory = [...chatHistory, { role: 'user' as const, text: userMsg }];
        setChatHistory(newHistory);
        setIsChatting(true);

        try {
            const data = await api.planQa(userMsg, topology.node_name, newHistory);
            if (data.status === "question") {
                setChatHistory(prev => [...prev, { role: 'model', text: data.text }]);
            } else if (data.status === "plan") {
                setLatestPlan(data.plan);
                setChatHistory(prev => [...prev, { role: 'model', text: `Here's your plan: ${data.plan.goal}` }]);
            } else {
                const errMsg = data.errors?.length ? `${data.message}: ${data.errors.join(", ")}` : data.message;
                setChatHistory(prev => [...prev, { role: 'model', text: errMsg }]);
            }
        } catch (err) {
            console.error("Plan QA error:", err);
            setChatHistory(prev => [...prev, { role: 'model', text: "Connection error. Backend offline." }]);
        } finally {
            setIsChatting(false);
        }
    };

    return (
        <div className="flex flex-col rounded-2xl overflow-hidden min-h-[280px] max-h-[380px] surface-card">
            {/* Header */}
            <div className="px-4 py-2.5 flex items-center justify-between"
                style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                    <h3 className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
                        Plan generation
                    </h3>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowTerminal(!showTerminal)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium transition-all"
                        style={{
                            background: showTerminal ? 'var(--accent-dim)' : 'transparent',
                            color: showTerminal ? 'var(--accent)' : 'var(--text-muted)',
                            border: `1px solid ${showTerminal ? 'var(--accent)' : 'var(--border)'}`,
                        }}
                    >
                        <Terminal className="w-2.5 h-2.5" />
                        LOG
                    </button>

                    {!topology ? (
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded"
                            style={{ color: 'var(--danger)', background: 'rgba(248, 113, 113, 0.08)', border: '1px solid rgba(248, 113, 113, 0.15)' }}>
                            NO CONTEXT
                        </span>
                    ) : (
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded"
                            style={{ color: 'var(--accent)', background: 'var(--accent-dim)' }}>
                            {topology.node_name}
                        </span>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3"
                style={{ background: 'var(--bg-primary)' }}>
                {chatHistory.length === 0 && (
                    <div className="text-center my-auto flex flex-col items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                        <MessageSquare className="w-6 h-6 opacity-20" />
                        <p className="text-[13px] font-medium">Describe a task or answer questions to generate a plan</p>
                        <p className="text-[11px] font-mono opacity-60">&quot;Clean the kitchen&quot;</p>
                    </div>
                )}
                {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                        <div className="max-w-[85%] px-3 py-2 rounded-lg text-[13px] leading-relaxed"
                            style={msg.role === 'user'
                                ? { background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--border-strong)' }
                                : { background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }
                            }>
                            {msg.text}
                        </div>
                    </div>
                ))}
                {isChatting && (
                    <div className="flex justify-start animate-fade-in">
                        <div className="px-3 py-2 rounded-lg flex items-center gap-2"
                            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                            <Loader2 className="w-3 h-3 animate-spin" style={{ color: 'var(--text-muted)' }} />
                            <span className="font-mono text-[12px]" style={{ color: 'var(--text-muted)' }}>Generating plan...</span>
                        </div>
                    </div>
                )}
                {latestPlan && (
                    <div className="rounded-lg p-3 animate-fade-in"
                        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <ListChecks className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                            <span className="text-[12px] font-bold" style={{ color: 'var(--text-primary)' }}>{latestPlan.goal}</span>
                        </div>
                        <p className="text-[10px] font-mono mb-2" style={{ color: 'var(--text-muted)' }}>
                            {latestPlan.room} · {latestPlan.subtasks.length} subtasks, {latestPlan.dependency_graph.edges.length} dependencies
                        </p>
                        <ul className="space-y-1.5">
                            {latestPlan.subtasks.map(st => (
                                <li key={st.id} className="text-[11px] leading-snug"
                                    style={{ color: 'var(--text-primary)', borderLeft: '2px solid var(--accent)', paddingLeft: 8 }}>
                                    <span className="font-mono font-medium">{st.id}</span> {st.action}: {st.description}
                                    {st.depends_on.length > 0 && (
                                        <span className="font-mono opacity-70" style={{ color: 'var(--text-muted)' }}> (after {st.depends_on.join(", ")})</span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            {/* System Log */}
            {showTerminal && (
                <div className="h-28 overflow-y-auto px-3 py-2 font-mono text-[10px] space-y-0.5"
                    style={{ background: 'var(--bg-primary)', borderTop: '1px solid var(--border)', color: 'var(--accent)' }}>
                    {systemLogs.length === 0 ? (
                        <div style={{ color: 'var(--text-muted)' }}>Waiting for system events...</div>
                    ) : (
                        systemLogs.map((log, i) => (
                            <div key={i} className="flex gap-2">
                                <span style={{ color: 'var(--text-muted)' }}>{new Date().toLocaleTimeString()}</span>
                                <span>{log}</span>
                            </div>
                        ))
                    )}
                    <div ref={terminalEndRef} />
                </div>
            )}

            {/* Input */}
            <form onSubmit={handleChatSubmit} className="px-3 py-2.5 flex gap-2"
                style={{ borderTop: '1px solid var(--border)' }}>
                <input
                    type="text"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder={topology ? "Describe your task or answer the question..." : "Process a node first"}
                    className="flex-1 rounded-lg px-3 py-1.5 text-[13px] transition-colors"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    disabled={isChatting || !topology}
                />
                <button
                    type="submit"
                    disabled={isChatting || !chatInput.trim() || !topology}
                    className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30 transition-all"
                    style={{ background: 'var(--accent)', color: '#09090B' }}
                >
                    <Send className="w-3.5 h-3.5" />
                </button>
            </form>
        </div>
    );
}
