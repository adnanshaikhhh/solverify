"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useMotionValue, useSpring, animate } from "framer-motion";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}

export function AnimatedCounter({ value, duration = 800, format, className }: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const motion = useMotionValue(0);
  const spring = useSpring(motion, { duration: duration / 1000, bounce: 0 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const unsub = spring.on("change", (v) => setDisplay(v));
    return unsub;
  }, [spring]);

  useEffect(() => {
    if (inView) motion.set(value);
  }, [inView, value, motion]);

  // Initial animation to value on mount
  useEffect(() => {
    if (!inView) return;
    const controls = animate(motion, value, { duration: duration / 1000 });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, value]);

  const formatted = format ? format(display) : Math.round(display).toLocaleString();
  return (
    <span ref={ref} className={className}>
      {formatted}
    </span>
  );
}
