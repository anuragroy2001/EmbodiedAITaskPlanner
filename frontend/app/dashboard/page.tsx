"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SpatialNode, ObjectLocation } from '../lib/api';
import NodeCaptureComponent from "../components/NodeCaptureComponent";
import { ArrowLeft } from "lucide-react";

export default function CapturePage() {
  const router = useRouter();

  const handleGenerate = useCallback((topology: SpatialNode, mapImage: string, locations: ObjectLocation[]) => {
    sessionStorage.setItem("spatialResults", JSON.stringify({ topology, mapImage, locations }));
    router.push("/dashboard/results");
  }, [router]);

  return (
    <div className="space-bg min-h-screen">
      <div className="relative z-[1] flex flex-col min-h-screen">

        {/* HEADER */}
        <header style={{
          borderBottom: '1px solid var(--border)',
          background: 'rgba(12, 12, 12, 0.65)',
          backdropFilter: 'blur(24px)',
        }}>
          <div className="max-w-[1400px] mx-auto px-8 h-[72px] flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/"
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

          </div>
        </header>

        {/* FULL-PAGE CAPTURE */}
        <main className="flex-1 flex flex-col items-center px-4 md:px-8 py-6">
          <div className="text-center mb-4">
            <h2 className="text-[24px] md:text-[32px] font-bold tracking-[-0.03em] text-white mb-2">
              Spatial Capture
            </h2>
            <p className="text-[14px] leading-[1.7] max-w-[440px] mx-auto" style={{ color: '#666' }}>
              Walk a loop around the area and capture sequential photos.
            </p>
          </div>

          <div className="w-full flex-1 flex items-center justify-center">
            <NodeCaptureComponent onGenerate={handleGenerate} />
          </div>
        </main>

        {/* FOOTER */}
        <footer style={{
          borderTop: '1px solid var(--border)',
          background: 'rgba(12, 12, 12, 0.4)',
          backdropFilter: 'blur(16px)',
        }}>
          <div className="max-w-[1400px] mx-auto px-8 h-14 flex items-center text-[12px]"
            style={{ color: 'var(--text-muted)' }}>
            <span className="font-semibold">Robotic Planning with Gemini</span>
          </div>
        </footer>

      </div>
    </div>
  );
}
