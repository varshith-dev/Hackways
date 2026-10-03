import React from "react";

/**
 * Staggered text reveal — the Magic UI TextAnimate API, implemented in CSS.
 *
 * Why not the library version: it renders every segment at opacity 0 and only
 * reveals them after hydration. On the hero headline that means the LCP element
 * is invisible until JS arrives, so the most important text on the page flashes
 * in late and is missing from the first paint. Here the text is in the HTML and
 * visible by default; the animation is presentation layered on top, so it also
 * degrades cleanly under prefers-reduced-motion and on older browsers.
 *
 * Differences from the library, all consequences of there being no JS:
 *   - no `exit` animations (nothing unmounts it)
 *   - `once` is implicit for the default timed mode; with startOnView the
 *     scroll-linked animation re-runs if you scroll back up
 *   - `variants` (custom motion variants) is not supported; use `animation`
 */

export type TextAnimateBy = "text" | "word" | "character" | "line";

export type TextAnimateVariant =
  | "fadeIn"
  | "blurIn"
  | "blurInUp"
  | "blurInDown"
  | "slideUp"
  | "slideDown"
  | "slideLeft"
  | "slideRight"
  | "scaleUp"
  | "scaleDown";

type AsTag = "p" | "span" | "div" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "li" | "section" | "article";

interface TextAnimateProps {
  /** The text content to animate */
  children: string;
  /** Class applied to the container */
  className?: string;
  /** Class applied to each segment */
  segmentClassName?: string;
  /** Seconds before the animation starts (timed mode only) */
  delay?: number;
  /** Seconds each segment takes */
  duration?: number;
  /** Element type to render */
  as?: AsTag;
  /** How to split the text */
  by?: TextAnimateBy;
  /** Drive the animation from scroll position rather than a timer */
  startOnView?: boolean;
  /** The animation preset */
  animation?: TextAnimateVariant;
  /** Expose the whole string to screen readers and hide the segments */
  accessible?: boolean;
}

/** Per-segment stagger, in ms. Smaller units need a tighter step. */
const STAGGER: Record<TextAnimateBy, number> = {
  text: 0,
  line: 70,
  word: 42,
  character: 22,
};

function split(text: string, by: TextAnimateBy): string[] {
  switch (by) {
    case "character":
      return Array.from(text);
    case "line":
      return text.split("\n");
    case "text":
      return [text];
    case "word":
    default:
      // Keep the separators so spacing survives inline-block segments.
      return text.split(/(\s+)/);
  }
}

export default function TextAnimate({
  children,
  className = "",
  segmentClassName = "",
  delay = 0,
  duration = 0.5,
  as: Tag = "p",
  by = "word",
  startOnView = false,
  animation = "fadeIn",
  accessible = true,
}: TextAnimateProps) {
  const segments = split(children, by);

  return (
    <Tag
      className={`ta-${animation} ${by === "line" ? "ta-line" : ""} ${
        startOnView ? "ta-onview" : ""
      } ${className}`}
      style={
        {
          "--ta-delay": `${delay}s`,
          "--ta-duration": `${duration}s`,
          "--ta-stagger": `${STAGGER[by]}ms`,
        } as React.CSSProperties
      }
      aria-label={accessible ? children : undefined}
    >
      {segments.map((segment, i) => (
        <span
          key={`${by}-${i}-${segment}`}
          className={`ta-seg ${segmentClassName}`}
          style={{ "--i": i } as React.CSSProperties}
          aria-hidden={accessible ? true : undefined}
        >
          {segment}
        </span>
      ))}
    </Tag>
  );
}
