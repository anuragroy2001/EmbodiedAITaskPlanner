"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setCookie, ROBOT_TYPE_COOKIE } from "../lib/cookies";
import { HumanoidSvgContent, QuadrupedSvgContent, MobileBaseSvgContent } from "../components/RobotTypeIcons";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

type RobotType = "humanoid" | "quadruped" | "mobile-base";

interface RobotOption {
  id: RobotType;
  name: string;
  description: string;
  icon: React.ReactNode;
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
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function SelectRobotPage() {
  const [selected, setSelected] = useState<RobotType | null>(null);
  const router = useRouter();

  const handleContinue = () => {
    if (!selected) return;
    const cookieValue = selected === "humanoid" ? "humanoid" : selected === "quadruped" ? "quadrupeds" : "mobile base";
    setCookie(ROBOT_TYPE_COOKIE, cookieValue, { maxAge: 365 * 24 * 60 * 60, path: "/" });
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
