"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Wraps one of the stroke-based icons from hugeicons.tsx and draws it in with
 * a real GSAP timeline + ScrollTrigger, once, the first time it scrolls into
 * view — stroke-dasharray/dashoffset on each geometry primitive inside the
 * icon's own <svg>, not a filter or a glow. Sharp line work, matching the
 * "precise and thin" language the rest of the page is built on.
 *
 * No changes needed to hugeicons.tsx: the icon components aren't forwardRef,
 * so instead of trying to ref the <svg> itself this queries the DOM for its
 * drawable children (path/line/circle/polyline/rect) after mount. That also
 * means it works with any of them interchangeably — pass whichever icon as
 * `children`.
 */
export default function DrawIcon({
  children,
  duration = 0.6,
  delay = 0,
  stagger = 0.08,
}: {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  stagger?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    const svg = el?.querySelector("svg");
    if (!el || !svg) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const shapes = Array.from(
      svg.querySelectorAll<SVGGeometryElement>("path, line, circle, polyline, rect")
    );
    if (!shapes.length) return;

    const lengths = shapes.map((s) => s.getTotalLength());
    shapes.forEach((s, i) => gsap.set(s, { strokeDasharray: lengths[i], strokeDashoffset: lengths[i] }));

    const tween = gsap.to(shapes, {
      strokeDashoffset: 0,
      duration,
      delay,
      stagger,
      ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 88%", once: true },
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [duration, delay, stagger]);

  return (
    <span ref={ref} className="inline-block">
      {children}
    </span>
  );
}
