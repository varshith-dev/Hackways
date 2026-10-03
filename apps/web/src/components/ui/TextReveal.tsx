import React from "react";

/**
 * Words light up one at a time as a tall sticky section scrolls past — the Magic
 * UI TextReveal, implemented with a named CSS view timeline.
 *
 * The library version maps scrollYProgress onto a [start, end] range per word;
 * `animation-range` with a per-word slice of a shared timeline is the same thing
 * natively, so this needs no JS and stays a server component.
 *
 * It also fixes a legibility trap in the original: there, every word sits at
 * opacity 0 until scroll moves it, so with JS disabled (or on a browser the
 * effect does not reach) the paragraph is invisible. Here the words are fully
 * opaque by default and only dim where the animation can actually run.
 *
 * Track height is a prop because this trades a lot of scroll for one sentence —
 * the original hard-codes 200vh. Keep the sentence short.
 */
export default function TextReveal({
  children,
  className = "",
  trackHeight = "170vh",
}: {
  children: string;
  className?: string;
  trackHeight?: string;
}) {
  const words = children.split(" ");

  return (
    <div className={`tr-track ${className}`} style={{ height: trackHeight }}>
      <div className="tr-sticky">
        <p
          className="mx-auto flex max-w-4xl flex-wrap justify-center gap-x-[0.28em] gap-y-1 px-6 text-center font-heading text-[1.75rem] font-bold leading-[1.2] tracking-[-0.03em] text-caviar sm:text-[2.6rem] lg:text-[3.25rem]"
          style={{ "--n": words.length } as React.CSSProperties}
        >
          {words.map((word, i) => (
            <span
              key={`${i}-${word}`}
              className="tr-word"
              style={{ "--i": i } as React.CSSProperties}
            >
              {word}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}
