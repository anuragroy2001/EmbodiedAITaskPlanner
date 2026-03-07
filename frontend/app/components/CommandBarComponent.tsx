"use client";

import { useState, useRef, useEffect } from "react";
import { Send, MessageSquare, Loader2 } from "lucide-react";
import { api, SpatialNode, PlannerOutput, PlanSummary } from "../lib/api";
import { getCookie, setCookie, ROBOT_TYPE_COOKIE } from "../lib/cookies";
import { HumanoidSvgContent, QuadrupedSvgContent, MobileBaseSvgContent } from "./RobotTypeIcons";
import InteractivePlanView from "./InteractivePlanView";

const ROBOT_TYPE_OPTIONS = [
  { value: "humanoid" as const, label: "Humanoid", Icon: HumanoidSvgContent },
  { value: "quadruped" as const, label: "Quadruped", Icon: QuadrupedSvgContent },
  { value: "mobile_base" as const, label: "Mobile Base", Icon: MobileBaseSvgContent },
] as const;
type RobotTypeValue = (typeof ROBOT_TYPE_OPTIONS)[number]["value"];

interface CommandBarProps {
    topology: SpatialNode | null;
    systemLogs: string[];
    onPlanGenerated?: (plan: PlannerOutput | null) => void;
}

export default function CommandBarComponent({ topology, systemLogs, onPlanGenerated }: CommandBarProps) {
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model', text: string }[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [isChatting, setIsChatting] = useState(false);
    const [robotType, setRobotType] = useState<RobotTypeValue>("humanoid");
    const [latestPlan, setLatestPlan] = useState<PlannerOutput | null>(null);
    const [latestPlanSummary, setLatestPlanSummary] = useState<PlanSummary | null>(null);
    const [isFollowUpPlanning, setIsFollowUpPlanning] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const stored = getCookie(ROBOT_TYPE_COOKIE);
        if (stored && ROBOT_TYPE_OPTIONS.some(o => o.value === stored)) {
            setRobotType(stored as RobotTypeValue);
        }
    }, []);

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

        const isFollowUp = chatHistory.length > 0 || latestPlan !== null;
        if (isFollowUp) {
            setChatHistory([{ role: 'user', text: userMsg }]);
            setLatestPlan(null);
            setLatestPlanSummary(null);
            onPlanGenerated?.(null);
        }

        const newHistory = [...chatHistory, { role: 'user' as const, text: userMsg }];
        if (!isFollowUp) {
            setChatHistory(newHistory);
        }
        setIsFollowUpPlanning(isFollowUp);
        setIsChatting(true);

        try {
            const data = await api.planQa(userMsg, topology.node_name, newHistory, robotType);
            if (data.status === "question") {
                setChatHistory(prev => [...prev, { role: 'model', text: data.text }]);
            } else if (data.status === "plan") {
                setLatestPlan(data.plan);
                setLatestPlanSummary(data.plan_summary);
                onPlanGenerated?.(data.plan);
                setChatHistory(prev => [...prev, { role: 'model', text: `Here's your plan: ${data.plan.goal}` }]);
            } else {
                const errMsg = data.errors?.length ? `${data.message}: ${data.errors.join(", ")}` : data.message;
                setChatHistory(prev => [...prev, { role: 'model', text: errMsg }]);
            }
        } catch (err) {
            console.error("Chat error:", err);
            setChatHistory(prev => [...prev, { role: 'model', text: "Connection error. VLA offline." }]);
        } finally {
            setIsChatting(false);
        }
    };

    return (
        <div className="flex flex-col flex-1 min-h-0 rounded-2xl overflow-hidden surface-card">
            {/* Header */}
            <div className="px-4 py-2.5 flex items-center justify-between"
                style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                    <h3 className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
                        Plan Q&A
                    </h3>
                </div>

                <div className="flex items-center gap-2">
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
                {!latestPlan && chatHistory.length === 0 && !isChatting && (
                    <div className="text-center my-auto flex flex-col items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                        <MessageSquare className="w-6 h-6 opacity-20" />
                        <p className="text-[13px] font-medium">Describe a task to plan</p>
                    </div>
                )}
                {!latestPlan && chatHistory.map((msg, i) => (
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
                {isChatting && !isFollowUpPlanning && (
                    <div className="flex justify-start animate-fade-in shrink-0">
                        <div className="px-3 py-2 rounded-lg flex items-center gap-2"
                            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                            <Loader2 className="w-3 h-3 animate-spin" style={{ color: 'var(--text-muted)' }} />
                            <span className="font-mono text-[12px]" style={{ color: 'var(--text-muted)' }}>Planning...</span>
                        </div>
                    </div>
                )}
                {isChatting && !isFollowUpPlanning && (
                    <div
                        className="rounded-lg overflow-hidden animate-fade-in flex flex-col items-center justify-center py-8 px-4"
                        style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
                    >
                        <Loader2 className="w-6 h-6 animate-spin mb-2" style={{ color: "var(--text-muted)" }} />
                        <span className="font-mono text-[13px]" style={{ color: "var(--text-muted)" }}>Planning...</span>
                    </div>
                )}
                {!isChatting && latestPlan && (
                    <InteractivePlanView plan={latestPlan} planSummary={latestPlanSummary} />
                )}
                <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleChatSubmit} className="px-3 py-2.5 flex flex-col gap-2"
                style={{ borderTop: '1px solid var(--border)' }}>
                <div className="flex gap-2 items-center">
                    <input
                        type="text"
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        placeholder={latestPlan ? "Suggest a follow-up..." : topology ? "Describe a task to plan..." : "Process a node first"}
                        className="flex-1 min-w-0 rounded-lg px-3 py-1.5 text-[13px] transition-colors"
                        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                        disabled={isChatting || !topology}
                    />
                    <button
                        type="submit"
                        disabled={isChatting || !chatInput.trim() || !topology}
                        className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30 transition-all shrink-0"
                        style={{ background: 'var(--accent)', color: '#09090B' }}
                    >
                        <Send className="w-3.5 h-3.5" />
                    </button>
                </div>
                <div className="flex gap-2">
                    {ROBOT_TYPE_OPTIONS.map((opt) => {
                        const Icon = opt.Icon;
                        const isSelected = robotType === opt.value;
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                    setRobotType(opt.value);
                                    setCookie(ROBOT_TYPE_COOKIE, opt.value, { maxAge: 365 * 24 * 60 * 60, path: "/" });
                                }}
                                title={opt.label}
                                className="flex-1 flex flex-col items-center justify-center gap-1 rounded-lg py-2 px-2 transition-all shrink-0"
                                style={{
                                    background: isSelected ? 'var(--accent-dim)' : 'var(--bg-secondary)',
                                    border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                                    color: isSelected ? 'var(--accent)' : 'var(--text-muted)',
                                }}
                            >
                                <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 shrink-0">
                                    <Icon />
                                </svg>
                                <span className="text-[10px] font-medium truncate w-full text-center" style={{ color: 'inherit' }}>
                                    {opt.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </form>
        </div>
    );
}
