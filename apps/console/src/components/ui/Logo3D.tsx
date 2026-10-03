import React from "react";

interface LogoProps {
  className?: string;
  style?: React.CSSProperties;
}

/** mix-blend-difference auto-adaptation was tried here and kept breaking:
 * it only sees what's in the same stacking context, so any ancestor with a
 * transform, opacity, or backdrop-filter (sticky headers, hover-lifted
 * cards, the translucent landing nav) isolates it and the wordmark goes
 * invisible or washed out. Every real placement in this app sits on a light
 * surface, so this just renders the SVG's own black-to-indigo fill — no
 * blend mode, nothing to isolate. */
export default function Logo3D({ className = "", style = {} }: LogoProps) {
  return (
    <img
      src="/hackways-wordmark.svg"
      alt="Hackways"
      style={style}
      className={`h-7 w-auto select-none transition-opacity duration-200 hover:opacity-85 sm:h-8 ${className}`.trim()}
    />
  );
}
