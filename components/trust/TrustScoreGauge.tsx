"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTrustScore } from "@/hooks/useTrustScore";
import { Shield, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";

interface TrustScoreGaugeProps {
  score: number;
  size?: "sm" | "md" | "lg" | "xl";
  showLabel?: boolean;
  showScore?: boolean;
  className?: string;
  animated?: boolean;
}

const SIZES = {
  sm: { svg: 64, stroke: 4, text: "text-sm", scoreText: "text-lg" },
  md: { svg: 96, stroke: 5, text: "text-sm", scoreText: "text-2xl" },
  lg: { svg: 140, stroke: 6, text: "text-base", scoreText: "text-4xl" },
  xl: { svg: 180, stroke: 7, text: "text-lg", scoreText: "text-5xl" },
};

const GRADE_ICON = {
  SAFU: ShieldCheck,
  Trusted: ShieldCheck,
  Caution: Shield,
  Risky: Shield,
  Danger: ShieldAlert,
};

export function TrustScoreGauge({
  score,
  size = "md",
  showLabel = true,
  showScore = true,
  className,
  animated = true,
}: TrustScoreGaugeProps) {
  const { grade, text, glow } = useTrustScore(score);
  const Icon = GRADE_ICON[grade];
  const cfg = SIZES[size];
  const radius = (cfg.svg - cfg.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(100, score)) / 100);

  const ringColor =
    grade === "SAFU" ? "#10B981" :
    grade === "Trusted" ? "#3B82F6" :
    grade === "Caution" ? "#F59E0B" :
    grade === "Risky" ? "#F97316" :
    "#EF4444";

  return (
    <div className={cn("inline-flex flex-col items-center gap-2", className)}>
      <div className={cn("relative", glow, grade === "Danger" && "animate-pulse-danger")}>
        <svg width={cfg.svg} height={cfg.svg} className="rotate-[-90deg]">
          <defs>
            <linearGradient id={`grad-${grade}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={ringColor} stopOpacity="0.4" />
              <stop offset="100%" stopColor={ringColor} stopOpacity="1" />
            </linearGradient>
          </defs>
          <circle
            cx={cfg.svg / 2}
            cy={cfg.svg / 2}
            r={radius}
            stroke="#1E1E2E"
            strokeWidth={cfg.stroke}
            fill="transparent"
          />
          <motion.circle
            cx={cfg.svg / 2}
            cy={cfg.svg / 2}
            r={radius}
            stroke={`url(#grad-${grade})`}
            strokeWidth={cfg.stroke}
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={animated ? { strokeDashoffset: circumference } : { strokeDashoffset: offset }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {showScore && (
            <div className={cn("font-mono font-bold", cfg.scoreText, text)}>
              {score}
            </div>
          )}
          <Icon className={cn("h-4 w-4", text)} />
        </div>
      </div>
      {showLabel && (
        <div className={cn("font-semibold uppercase tracking-wider", cfg.text, text)}>
          {grade}
        </div>
      )}
    </div>
  );
}
