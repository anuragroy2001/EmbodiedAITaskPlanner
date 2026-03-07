"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Cpu,
  Github,
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
          </div>
        </nav>

        {/* ─── HERO ─── */}
        <section className="relative pt-[120px] pb-[80px] md:pt-[160px] md:pb-[120px] lg:pt-[140px] lg:pb-[100px] px-6 md:px-10">
          <div className="hero-glow" />
          <div className="max-w-[1200px] mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <div
                className="inline-flex items-center gap-3 px-6 py-3 rounded-full mb-12 text-[26px] md:text-[30px] font-medium"
                style={{
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  color: "#aaaaaa",
                }}
              >
                <Cpu className="w-5 h-5 md:w-6 md:h-6" />
                Robotic Planning with Gemini
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="text-[100px] md:text-[150px] lg:text-[220px] font-black tracking-[-0.04em] leading-[0.98] mb-12"
            >
              <span className="text-white">We teach robots</span>
              <br />
              <span className="text-gradient">to understand space.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="text-[36px] md:text-[48px] leading-[1.5] max-w-[920px] mx-auto mb-16"
              style={{ color: "#999999" }}
            >
              Turn a walkthrough into a navigable spatial map. Our vision-language
              pipeline builds floor plans, semantic graphs, and 2D digital twins
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
        </section>

        {/* ─── FOOTER ─── */}
        <footer
          style={{
            borderTop: "1px solid rgba(255, 255, 255, 0.04)",
            background: "rgba(12, 12, 12, 0.9)",
            backdropFilter: "blur(16px)",
          }}
        >
          <div className="max-w-[1200px] mx-auto px-6 md:px-10 py-8 md:py-10 flex flex-col sm:flex-row items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-3">
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
            </Link>
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
          </div>
        </footer>
      </div>
    </div>
  );
}
