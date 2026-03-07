"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

type RobotType = "humanoid" | "quadruped" | "mobile-base";

interface RobotOption {
  id: RobotType;
  name: string;
  description: string;
  icon: React.ReactNode;
}

function HumanoidSvgContent() {
  return (
    <>
      <rect x="28" y="8" width="24" height="20" rx="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <circle cx="36" cy="18" r="2" fill="currentColor" />
      <circle cx="44" cy="18" r="2" fill="currentColor" />
      <line x1="35" y1="23" x2="45" y2="23" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="40" y1="28" x2="40" y2="32" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="26" y="32" width="28" height="22" rx="4" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <line x1="40" y1="36" x2="40" y2="50" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
      <line x1="26" y1="36" x2="16" y2="48" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="48" x2="14" y2="56" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="54" y1="36" x2="64" y2="48" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="64" y1="48" x2="66" y2="56" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="34" y1="54" x2="32" y2="66" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="32" y1="66" x2="30" y2="74" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="46" y1="54" x2="48" y2="66" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="48" y1="66" x2="50" y2="74" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="26" y1="74" x2="34" y2="74" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="46" y1="74" x2="54" y2="74" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>
  );
}

function QuadrupedSvgContent() {
  return (
    <>
      <rect x="16" y="24" width="48" height="20" rx="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <rect x="56" y="18" width="18" height="16" rx="4" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <circle cx="67" cy="25" r="1.5" fill="currentColor" />
      <circle cx="62" cy="25" r="1.5" fill="currentColor" />
      <line x1="61" y1="30" x2="67" y2="30" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="54" y1="44" x2="56" y2="56" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="56" y1="56" x2="58" y2="66" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="48" y1="44" x2="50" y2="56" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="50" y1="56" x2="52" y2="66" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="26" y1="44" x2="24" y2="56" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="24" y1="56" x2="22" y2="66" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="32" y1="44" x2="30" y2="56" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="30" y1="56" x2="28" y2="66" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="58" cy="67" r="2" fill="currentColor" opacity="0.5" />
      <circle cx="52" cy="67" r="2" fill="currentColor" opacity="0.5" />
      <circle cx="22" cy="67" r="2" fill="currentColor" opacity="0.5" />
      <circle cx="28" cy="67" r="2" fill="currentColor" opacity="0.5" />
      <path d="M16 28 Q10 22, 8 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </>
  );
}

function MobileBaseSvgContent() {
  return (
    <>
      <rect x="14" y="36" width="52" height="20" rx="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <rect x="28" y="16" width="24" height="16" rx="4" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <circle cx="40" cy="24" r="4" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <circle cx="40" cy="24" r="1.5" fill="currentColor" />
      <line x1="36" y1="32" x2="36" y2="36" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="44" y1="32" x2="44" y2="36" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="20" y1="42" x2="60" y2="42" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
      <line x1="20" y1="50" x2="60" y2="50" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
      <circle cx="24" cy="60" r="5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <circle cx="24" cy="60" r="1.5" fill="currentColor" />
      <circle cx="40" cy="62" r="4" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <circle cx="40" cy="62" r="1" fill="currentColor" />
      <circle cx="56" cy="60" r="5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <circle cx="56" cy="60" r="1.5" fill="currentColor" />
      <line x1="40" y1="16" x2="40" y2="10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="40" cy="8" r="2" stroke="currentColor" strokeWidth="1.2" fill="none" />
    </>
  );
}

const robots: RobotOption[] = [
  {
    id: "humanoid",
    name: "Humanoid",
    description: "Bipedal robot with arms and legs for human-like navigation and manipulation tasks.",
    icon: <HumanoidSvgContent />,
  },
  {
    id: "quadruped",
    name: "Quadruped",
    description: "Four-legged robot designed for rough terrain traversal and dynamic stability.",
    icon: <QuadrupedSvgContent />,
  },
  {
    id: "mobile-base",
    name: "Mobile Base",
    description: "Wheeled platform ideal for indoor navigation on flat surfaces with sensor payloads.",
    icon: <MobileBaseSvgContent />,
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

export default function SelectRobotPage() {
  const [selected, setSelected] = useState<RobotType | null>(null);
  const router = useRouter();

  const handleContinue = () => {
    if (!selected) return;
    sessionStorage.setItem("robotType", selected);
    router.push("/dashboard");
  };

  return (
    <div className="landing-bg min-h-screen">
      <div className="hero-gradient" />
      <div className="grid-overlay" />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <nav
          className="fixed top-0 left-0 right-0 z-50"
          style={{
            background: "rgba(12, 12, 12, 0.7)",
            backdropFilter: "blur(20px) saturate(1.4)",
            WebkitBackdropFilter: "blur(20px) saturate(1.4)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
          }}
        >
          <div className="max-w-[1200px] mx-auto px-6 md:px-10 h-[72px] flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
                style={{ border: "1px solid rgba(255, 255, 255, 0.1)", color: "#999" }}
              >
                <ArrowLeft className="w-4 h-4" />
              </div>
              <span className="text-[17px] font-bold tracking-[-0.02em] text-white">
                EmbodiedAI
              </span>
            </Link>
          </div>
        </nav>

        {/* Main content — fills entire viewport below navbar */}
        <div className="flex-1 flex flex-col pt-[72px]" style={{ height: "100vh" }}>
          {/* Title bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="text-center py-6 shrink-0"
          >
            <h1 className="text-[28px] md:text-[36px] font-black tracking-[-0.04em] leading-[1.1] mb-2 text-white">
              Select your robot
            </h1>
            <p className="text-[14px] md:text-[16px] leading-[1.7] max-w-[480px] mx-auto" style={{ color: "#999" }}>
              Choose the embodiment type for spatial planning and navigation.
            </p>
          </motion.div>

          {/* Cards grid — stretches to fill remaining height */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 px-4 md:px-6 pb-4 min-h-0"
          >
            {robots.map((robot) => {
              const isSelected = selected === robot.id;
              return (
                <motion.button
                  key={robot.id}
                  variants={cardVariants}
                  onClick={() => setSelected(robot.id)}
                  className="group relative flex flex-col items-center justify-center rounded-[24px] p-6 md:p-8 transition-all duration-300 cursor-pointer"
                  style={{
                    background: isSelected
                      ? "rgba(255, 255, 255, 0.06)"
                      : "rgba(18, 18, 18, 0.6)",
                    border: isSelected
                      ? "1.5px solid rgba(255, 255, 255, 0.25)"
                      : "1px solid rgba(255, 255, 255, 0.06)",
                    backdropFilter: "blur(24px) saturate(1.2)",
                    WebkitBackdropFilter: "blur(24px) saturate(1.2)",
                    boxShadow: isSelected
                      ? "0 8px 60px rgba(255, 255, 255, 0.06), 0 0 0 1px rgba(255, 255, 255, 0.1)"
                      : "0 4px 40px rgba(0, 0, 0, 0.6)",
                  }}
                  whileHover={{ y: -4, transition: { duration: 0.25 } }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Selected indicator */}
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center"
                      style={{
                        background: "#ffffff",
                        boxShadow: "0 2px 12px rgba(255, 255, 255, 0.2)",
                      }}
                    >
                      <Check className="w-4 h-4 text-[#0c0c0c]" strokeWidth={3} />
                    </motion.div>
                  )}

                  {/* Icon — large, fills card */}
                  <div
                    className="flex-1 w-full flex items-center justify-center transition-all duration-300 rounded-2xl"
                    style={{
                      background: isSelected
                        ? "rgba(255, 255, 255, 1)"
                        : "rgba(255, 255, 255, 0.9)",
                      color: "#0c0c0c",
                    }}
                  >
                    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg"
                      className="w-full h-full max-w-[280px] max-h-[280px]"
                    >
                      {robot.icon}
                    </svg>
                  </div>

                  {/* Text — pinned to bottom */}
                  <div className="shrink-0 mt-4">
                    <h3
                      className="text-[22px] md:text-[26px] font-bold tracking-[-0.02em] mb-2 text-center transition-colors duration-300"
                      style={{ color: isSelected ? "#ffffff" : "#ccc" }}
                    >
                      {robot.name}
                    </h3>
                    <p
                      className="text-[13px] md:text-[14px] leading-[1.6] text-center transition-colors duration-300 max-w-[260px] mx-auto"
                      style={{ color: isSelected ? "#aaa" : "#666" }}
                    >
                      {robot.description}
                    </p>

                    {/* Continue button inside the selected card */}
                    <div className="h-[52px] mt-4 flex items-center justify-center">
                      {isSelected && (
                        <motion.div
                          role="button"
                          tabIndex={0}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                          onClick={(e) => { e.stopPropagation(); handleContinue(); }}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); handleContinue(); } }}
                          className="cta-button text-[14px] font-semibold"
                          style={{
                            padding: "12px 32px",
                            borderRadius: "16px",
                            background: "#ffffff",
                            color: "#0c0c0c",
                            boxShadow: "0 4px 30px rgba(255, 255, 255, 0.15)",
                            cursor: "pointer",
                          }}
                        >
                          Continue
                          <ArrowRight className="w-4 h-4" />
                        </motion.div>
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
