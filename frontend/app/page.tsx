"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Camera,
  Map,
  Scan,
  Cpu,
  Github,
  Mail,
} from "lucide-react";

export default function LandingPage() {
  useEffect(() => {
    document.documentElement.removeAttribute("data-theme");
  }, []);

  return (
    <div className="landing-bg min-h-screen">
      <div className="hero-gradient" />
      <div className="grid-overlay" />

      <div className="relative z-10">
        {/* ─── NAVBAR ─── */}
        <nav className="fixed top-0 left-0 right-0 z-50" style={{
          background: "rgba(12, 12, 12, 0.7)",
          backdropFilter: "blur(20px) saturate(1.4)",
          WebkitBackdropFilter: "blur(20px) saturate(1.4)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
        }}>
          <div className="max-w-[1200px] mx-auto px-6 md:px-10 h-[72px] flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center font-display font-bold text-[13px] animate-glow-breathe"
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  color: "#ffffff",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                }}
              >
                R
              </div>
              <span className="text-[17px] font-bold tracking-[-0.02em] text-white">
                Robotic Planning with Gemini
              </span>
            </Link>

            <Link
              href="/select-robot"
              className="cta-button text-[13px] font-semibold"
              style={{
                padding: "10px 24px",
                borderRadius: "14px",
                background: "#ffffff",
                color: "#0c0c0c",
                boxShadow: "0 2px 20px rgba(255, 255, 255, 0.08)",
              }}
            >
              Launch App
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </nav>

        {/* ─── HERO ─── */}
        <section className="relative pt-[160px] pb-[120px] md:pt-[200px] md:pb-[160px] px-6 md:px-10">
          <div className="hero-glow" />
          <div className="max-w-[1200px] mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-[13px] font-medium"
                style={{
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  color: "#aaaaaa",
                }}
              >
                <Cpu className="w-3.5 h-3.5" />
                Robotic Planning with Gemini
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="text-[48px] md:text-[72px] lg:text-[84px] font-black tracking-[-0.04em] leading-[1.05] mb-8"
            >
              <span className="text-white">We teach robots</span>
              <br />
              <span className="text-gradient">to understand space.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="text-[18px] md:text-[20px] leading-[1.7] max-w-[640px] mx-auto mb-12"
              style={{ color: "#999999" }}
            >
              Turn a walkthrough into a navigable spatial map. Our vision-language
              pipeline builds floor plans, semantic graphs, and 3D digital twins
              — enabling autonomous robots to reason about the world around them.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link href="/select-robot" className="cta-button cta-button-primary">
                Get Started
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="cta-button cta-button-secondary"
              >
                <Github className="w-5 h-5" />
                View on GitHub
              </a>
            </motion.div>
          </div>

          {/* Hero visual element */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-[900px] mx-auto mt-20"
          >
            <div
              className="glass-card p-1 overflow-hidden"
              style={{
                boxShadow: "0 20px 80px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.04)",
              }}
            >
              <div
                className="rounded-[20px] overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, #111111 0%, #1a1a1a 50%, #111111 100%)",
                  border: "1px solid rgba(255, 255, 255, 0.03)",
                }}
              >
                <div className="p-6 md:p-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-3 h-3 rounded-full" style={{ background: "#555" }} />
                    <div className="w-3 h-3 rounded-full" style={{ background: "#777" }} />
                    <div className="w-3 h-3 rounded-full" style={{ background: "#999" }} />
                    <span className="text-[12px] font-mono ml-3" style={{ color: "#555" }}>
                      Robotic Planning with Gemini — Dashboard
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1 space-y-4">
                      <div
                        className="rounded-xl p-4 h-28"
                        style={{
                          background: "rgba(255, 255, 255, 0.02)",
                          border: "1px solid rgba(255, 255, 255, 0.06)",
                        }}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <Camera className="w-4 h-4" style={{ color: "#888" }} />
                          <span className="text-[11px] font-semibold" style={{ color: "#888" }}>
                            Spatial Capture
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[...Array(6)].map((_, i) => (
                            <div
                              key={i}
                              className="aspect-square rounded-md"
                              style={{
                                background: `rgba(255, 255, 255, ${0.03 + i * 0.01})`,
                                border: "1px solid rgba(255, 255, 255, 0.04)",
                              }}
                            />
                          ))}
                        </div>
                      </div>
                      <div
                        className="rounded-xl p-4 h-24"
                        style={{
                          background: "rgba(255, 255, 255, 0.02)",
                          border: "1px solid rgba(255, 255, 255, 0.06)",
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Scan className="w-4 h-4" style={{ color: "#888" }} />
                          <span className="text-[11px] font-semibold" style={{ color: "#888" }}>
                            Pipeline
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {[1, 2, 3].map(i => (
                            <div key={i} className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#666" }} />
                              <div className="h-1.5 rounded-full flex-1" style={{ background: "rgba(255, 255, 255, 0.06)" }} />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div
                      className="col-span-2 rounded-xl p-6 min-h-[200px] flex items-center justify-center"
                      style={{
                        background: "rgba(0, 0, 0, 0.4)",
                        border: "1px solid rgba(255, 255, 255, 0.04)",
                      }}
                    >
                      <div className="text-center">
                        <Map className="w-10 h-10 mx-auto mb-3 animate-float" style={{ color: "#555", opacity: 0.6 }} />
                        <p className="text-[13px] font-medium" style={{ color: "#555" }}>
                          Spatial visualization area
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ─── FOOTER ─── */}
        <footer
          style={{
            borderTop: "1px solid rgba(255, 255, 255, 0.04)",
            background: "rgba(12, 12, 12, 0.9)",
            backdropFilter: "blur(16px)",
          }}
        >
          <div className="max-w-[1200px] mx-auto px-6 md:px-10 py-12 md:py-16">
            <div className="flex flex-col md:flex-row items-start justify-between gap-10 mb-12">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center font-display font-bold text-[13px]"
                    style={{
                      background: "rgba(255, 255, 255, 0.05)",
                      color: "#ffffff",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                    }}
                  >
                    R
                  </div>
                  <span className="text-[17px] font-bold text-white tracking-[-0.02em]">
                    Robotic Planning with Gemini
                  </span>
                </div>
                <p className="text-[14px] leading-[1.7] max-w-[300px]" style={{ color: "#666" }}>
                  Robotic Planning with Gemini — indoor spatial intelligence and
                  autonomous navigation.
                </p>
              </div>

              <div className="flex gap-16">
                <div>
                  <h4 className="text-[13px] font-bold text-white mb-4 tracking-wide uppercase">
                    Platform
                  </h4>
                  <div className="flex flex-col gap-3">
                    <Link href="/dashboard" className="text-[14px] hover:text-white transition-colors" style={{ color: "#888" }}>
                      Dashboard
                    </Link>
                  </div>
                </div>
                <div>
                  <h4 className="text-[13px] font-bold text-white mb-4 tracking-wide uppercase">
                    Connect
                  </h4>
                  <div className="flex flex-col gap-3">
                    <a
                      href="https://github.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[14px] hover:text-white transition-colors flex items-center gap-2"
                      style={{ color: "#888" }}
                    >
                      <Github className="w-4 h-4" />
                      GitHub
                    </a>
                    <a
                      href="mailto:contact@rpg.dev"
                      className="text-[14px] hover:text-white transition-colors flex items-center gap-2"
                      style={{ color: "#888" }}
                    >
                      <Mail className="w-4 h-4" />
                      Contact
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4"
              style={{ borderTop: "1px solid rgba(255, 255, 255, 0.04)" }}
            >
              <p className="text-[13px]" style={{ color: "#555" }}>
                &copy; {new Date().getFullYear()} Robotic Planning with Gemini. All rights reserved.
              </p>
              <p className="text-[13px] italic" style={{ color: "#555" }}>
                Robotic Planning with Gemini.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
