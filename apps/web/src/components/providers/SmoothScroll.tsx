"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * High-performance Lenis.dev smooth scroll setup.
 * Configured with responsive lerp easing and scroll-behavior de-confliction.
 */
export default function SmoothScroll() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.location.pathname.startsWith("/console") || window.location.pathname.startsWith("/m/console")) return;

    const lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.2,
      infinite: false,
      prevent: (node) => {
        return (
          node.hasAttribute("data-lenis-prevent") ||
          Boolean(node.closest?.("[data-lenis-prevent], .overflow-y-auto, [class*='overflow-y-auto']"))
        );
      },
    });

    let frameId: number;
    function raf(time: number) {
      lenis.raf(time);
      frameId = requestAnimationFrame(raf);
    }
    frameId = requestAnimationFrame(raf);

    let observer: IntersectionObserver | undefined;
    if (!CSS.supports("animation-timeline", "view()")) {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            entry.target.classList.add("is-visible");
            observer!.unobserve(entry.target);
          }
        },
        { rootMargin: "0px 0px -20% 0px" },
      );
      document.querySelectorAll(".rise").forEach((el) => observer!.observe(el));
    }

    return () => {
      cancelAnimationFrame(frameId);
      lenis.destroy();
      observer?.disconnect();
    };
  }, []);

  return null;
}
