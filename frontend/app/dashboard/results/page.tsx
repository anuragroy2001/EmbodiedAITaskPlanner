"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SpatialNode, ObjectLocation, PlannerOutput, api } from '../../lib/api';
import CommandBarComponent from "../../components/CommandBarComponent";
import InteriorMapComponent from "../../components/InteriorMapComponent";
import SemanticGraph from "../../components/SemanticGraph";
import { Sun, Moon, Map, GitBranch, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export default function ResultsPage() {
  const router = useRouter();
  const [topology, setTopology] = useState<SpatialNode | null>(null);
  const [mapImage, setMapImage] = useState<string | null>(null);
  const [locations, setLocations] = useState<ObjectLocation[]>([]);
  const [sourceImages, setSourceImages] = useState<string[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'MAP' | 'GRAPH'>('MAP');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [robotApiUrl] = useState("http://localhost:8080/nav2/follow_waypoints");
  const [systemLogs, setSystemLogs] = useState<string[]>([]);
  const [activePlan, setActivePlan] = useState<PlannerOutput | null>(null);

  const addSystemLog = (msg: string) => {
    setSystemLogs(prev => [...prev, msg]);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("spatialResults");
      if (!raw) {
        router.replace("/dashboard");
        return;
      }
      const parsed = JSON.parse(raw);
      setTopology(parsed.topology);
      setMapImage(parsed.mapImage);
      setLocations(parsed.locations || []);

      if (parsed.topology?.node_name) {
        api.getNodeImages(parsed.topology.node_name)
          .then(imgData => setSourceImages(imgData.images || []))
          .catch(err => console.error("Failed to fetch source images:", err));
      }
    } catch {
      router.replace("/dashboard");
    }
  }, [router]);

  const isDark = theme === 'dark';

  const viewTabs = [
    { key: 'MAP' as const, label: 'Map', icon: Map },
    { key: 'GRAPH' as const, label: 'Graph', icon: GitBranch },
  ];

  return (
    <div className="space-bg min-h-screen transition-colors duration-300"
      style={{ color: 'var(--text-primary)' }}>

      <div className="relative z-[1]">

        {/* HEADER */}
        <header style={{
          borderBottom: '1px solid var(--border)',
          background: isDark ? 'rgba(12, 12, 12, 0.65)' : 'var(--bg-primary)',
          backdropFilter: 'blur(24px)',
        }}>
          <div className="max-w-[1600px] mx-auto px-8 h-[72px] flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard"
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <h1 className="text-[18px] font-extrabold tracking-[-0.02em]"
                  style={{ color: 'var(--text-primary)' }}>
                  Robotic Planning with Gemini
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => setTheme(isDark ? 'light' : 'dark')}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </header>

        {/* MAIN */}
        <main className="max-w-[1600px] mx-auto px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-6"
          style={{ minHeight: "calc(100vh - 72px - 56px)" }}>

          {/* Visualization */}
          <div className="lg:col-span-8 surface-card rounded-2xl overflow-hidden flex flex-col animate-fade-in-up"
            style={{
              minHeight: "calc(100vh - 72px - 56px - 64px)",
              animationDelay: '0.1s',
              animationFillMode: 'both',
            }}>
            {topology ? (
              <>
                <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-3">
                    <h2 className="text-[14px] font-bold" style={{ color: 'var(--text-primary)' }}>
                      {viewMode === 'MAP' && 'Floor Plan'}
                      {viewMode === 'GRAPH' && 'Semantic Graph'}
                    </h2>
                    <span className="font-mono text-[11px] font-medium px-2 py-0.5 rounded-md"
                      style={{ color: 'var(--accent)', background: 'var(--accent-dim)' }}>
                      {topology.node_name}
                    </span>
                  </div>

                  <div className="flex rounded-xl p-1" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', border: '1px solid var(--border)' }}>
                    {viewTabs.map(tab => {
                      const Icon = tab.icon;
                      const active = viewMode === tab.key;
                      return (
                        <button key={tab.key} onClick={() => setViewMode(tab.key)}
                          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-all"
                          style={{
                            background: active ? 'var(--accent-dim)' : 'transparent',
                            color: active ? 'var(--accent)' : 'var(--text-muted)',
                          }}>
                          <Icon className="w-3.5 h-3.5" />
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="relative w-full flex-1" style={{ background: isDark ? '#0c0c0c' : '#F5F5F5' }}>
                  {viewMode === 'MAP' && mapImage && (
                    <InteriorMapComponent
                      mapImage={mapImage} locations={locations} topology={topology}
                      sourceImages={sourceImages} selectedObjectId={selectedObjectId}
                      onSelectObject={setSelectedObjectId} theme={theme}
                      robotApiUrl={robotApiUrl} onAddSystemLog={addSystemLog}
                      plan={activePlan}
                    />
                  )}
                  {viewMode === 'GRAPH' && <SemanticGraph data={topology} />}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-20 text-center min-h-[520px]">
                <Loader2 className="w-8 h-8 animate-spin mb-4" style={{ color: 'var(--text-muted)' }} />
                <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>
                  Loading spatial data...
                </p>
              </div>
            )}
          </div>

          {/* Chat */}
          <div className="lg:col-span-4 flex flex-col min-h-0 animate-fade-in-up" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
            <CommandBarComponent topology={topology} systemLogs={systemLogs} onPlanGenerated={setActivePlan} />
          </div>
        </main>

        {/* FOOTER */}
        <footer style={{
          borderTop: '1px solid var(--border)',
          background: isDark ? 'rgba(12, 12, 12, 0.4)' : 'var(--bg-primary)',
          backdropFilter: 'blur(16px)',
        }}>
          <div className="max-w-[1600px] mx-auto px-8 h-14 flex items-center text-[12px]"
            style={{ color: 'var(--text-muted)' }}>
            <span className="font-semibold">Robotic Planning with Gemini</span>
          </div>
        </footer>

      </div>

    </div>
  );
}
