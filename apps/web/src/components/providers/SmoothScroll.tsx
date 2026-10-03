"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Site-wide momentum scrolling (the "lenis.dev feel") — wheel and touch input
 * is eased toward its target over a few frames instead of jumping per tick.
 *
 * Lenis in its default configuration (no `wrapper`/`content` options) drives
 * the real `window` scroll position via requestAnimationFrame rather than
 * faking it with a transform on a content wrapper. That distinction matters
 * here specifically: this page's scroll reveals (.rise, TextAnimate
 * startOnView, TextReveal, the band burst) are native `animation-timeline:
 * view()` CSS, which tracks genuine scroll position. A transform-based
 * smooth-scroll library would desync those; this one doesn't, because the
 * browser still sees real scroll happening, just eased.
 *
 * Also carries the IntersectionObserver fallback for .rise on browsers
 * without animation-timeline: view() support (Firefox, older Safari): CSS
 * hides those elements and this toggles .is-visible as each one scrolls
 * into view, matching the native scroll-timeline reveal it stands in for.
 *
 * Renders nothing — this only attaches the scroll behaviour as a side effect,
 * so every page stays a server component; only this one small client leaf
 * exists to own the effect.
 */
export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t: number) => 1 - Math.pow(1 - t, 3), // ease-out cubic
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
