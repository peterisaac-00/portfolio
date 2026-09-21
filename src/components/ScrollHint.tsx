import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

/* ────────────────────────────────────────────
   ScrollHint
   Reusable scroll-triggered onboarding hint rendered inline next
   to a section heading. Used next to "Skills & Tools" (black) and
   "Featured Work" (white) — see `Skills` / `Projects` in App.tsx.

   Props:
     text  — hint message to display
     color — line, text and caret color (any CSS color: "#000",
             "white", "var(--...)", ...)

   Sequence (plays ONCE per page load per instance, then unmounts):
     1. short horizontal line draws left → right  (~0.3s, CSS keyframe)
     2. line rotates into a vertical line         (~0.25s, CSS keyframe)
     3. `text` unfurls from the line: typewriter char-reveal + a
        synced clip-path reveal, caret riding the leading edge
     4. hold everything ~2s, fade out ~0.3s, remove from DOM.

   - Trigger is an IntersectionObserver on the enclosing <section>,
     gated on a real scroll event so it never fires on plain page
     load. Each instance owns its own in-memory fired flag, so
     instances track "already shown" independently — one section's
     hint never suppresses another's. Deliberately no
     sessionStorage (that would suppress replays across refreshes).
   - Positioning: the hint is a plain in-flow flex item. Each parent
     wraps its heading + hint in a shrink-wrapped (`w-fit`, never
     full-width) flex row with a small gap, so the hint always sits
     directly next to the heading text and only wraps below it when
     both truly don't fit on one line.
   - prefers-reduced-motion: renders nothing at all.
   - pointer-events-none so it can never block taps (mobile first).
   ──────────────────────────────────────────── */

const DRAW_MS = 300; // phase 1: horizontal line draws in
const MORPH_MS = 250; // phase 2: line rotates to vertical
const TYPE_MS_PER_CHAR = 18; // phase 3: per-character typewriter pace

const HOLD_MS = 2000; // phase 4: hold fully-typed hint
const FADE_MS = 300; // phase 5: fade out, then unmount

type Phase = "draw" | "morph" | "typing" | "hold" | "fade";

export default function ScrollHint({
  text = "Tap on a skill to view details",
  color = "#000",
}: {
  text?: string;
  color?: string;
}) {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase | null>(null);
  const [typed, setTyped] = useState(0);
  const [gone, setGone] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const firedRef = useRef(false);
  const scrolledRef = useRef(false);

  // Total typewriter time — the clip-path unfurl below uses the same
  // duration so width-reveal and character-reveal stay in sync.
  const typeTotalMs = text.length * TYPE_MS_PER_CHAR;

  /* Trigger: observe the enclosing section. Fires only while
     intersecting AND after the user has actually scrolled (so a
     plain page load — even one landing on the section's hash —
     never starts the animation on its own). The in-memory
     `firedRef` flag (plus the `gone` state below) guarantees a
     single play per page load per instance: it replays on refresh,
     but never on re-entry within the same load. */
  useEffect(() => {
    if (reduceMotion) return;
    if (firedRef.current) return;

    const target =
      rootRef.current?.closest("section") ?? rootRef.current;
    if (!target) return;

    const inView = (el: Element) => {
      const r = el.getBoundingClientRect();
      return r.top < window.innerHeight * 0.85 && r.bottom > 0;
    };

    const fire = () => {
      if (firedRef.current) return;
      firedRef.current = true;
      setPhase("draw");
    };

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && scrolledRef.current) fire();
      },
      { threshold: 0.3 }
    );
    obs.observe(target);

    // Belt & braces: IntersectionObserver only fires on *changes*,
    // so also check on every scroll (covers "already intersecting
    // while the user keeps scrolling").
    const onScroll = () => {
      scrolledRef.current = true;
      if (inView(target)) fire();
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      obs.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [reduceMotion]);

  /* Phase machine: each phase schedules the next; all timers are
     cleaned up on phase change / unmount. */
  useEffect(() => {
    if (phase === null) return;
    let timeout: number | undefined;
    let interval: number | undefined;

    if (phase === "draw") {
      timeout = window.setTimeout(() => setPhase("morph"), DRAW_MS);
    } else if (phase === "morph") {
      timeout = window.setTimeout(() => {
        setTyped(0);
        setPhase("typing");
      }, MORPH_MS);
    } else if (phase === "typing") {
      interval = window.setInterval(() => {
        setTyped((c) => {
          if (c >= text.length) {
            if (interval !== undefined) window.clearInterval(interval);
            window.setTimeout(() => setPhase("hold"), 0);
            return c;
          }
          return c + 1;
        });
      }, TYPE_MS_PER_CHAR);
    } else if (phase === "hold") {
      timeout = window.setTimeout(() => setPhase("fade"), HOLD_MS);
    } else if (phase === "fade") {
      timeout = window.setTimeout(() => {
        setPhase(null);
        setGone(true); // remove from the DOM, never show again
      }, FADE_MS + 50);
    }

    return () => {
      window.clearTimeout(timeout);
      if (interval !== undefined) window.clearInterval(interval);
    };
  }, [phase, text]);

  // Reduced motion: skip the hint entirely. Done playing: unmount.
  if (reduceMotion) return null;
  if (gone) return null;

  const showText =
    phase === "typing" || phase === "hold" || phase === "fade";

  return (
    <span
      ref={rootRef}
      aria-hidden="true"
      className="pointer-events-none inline-flex min-w-0 items-center whitespace-nowrap"
    >
      {phase !== null && (
        <span
          className={`inline-flex items-center gap-1.5 transition-opacity duration-300 ${
            phase === "fade" ? "opacity-0" : "opacity-100"
          }`}
        >
          {/* Line: draws horizontally, then rotates to vertical.
              Fixed-size box so the rotation never shifts layout. */}
          <span className="flex h-4 w-4 items-center justify-center">
            <span
              style={
                phase === "draw"
                  ? {
                      width: 16,
                      height: 2,
                      backgroundColor: color,
                      transformOrigin: "left center",
                      animation:
                        "scroll-hint-draw 0.3s ease-out forwards",
                    }
                  : {
                      width: 16,
                      height: 2,
                      backgroundColor: color,
                      transformOrigin: "center",
                      transform: "rotate(90deg)",
                      animation:
                        phase === "morph"
                          ? "scroll-hint-morph 0.25s ease-in-out forwards"
                          : "none",
                    }
              }
            />
          </span>
          {/* Label: unfurls left-to-right from beside the line.
              overflow:hidden + a clip-path reveal (same duration as
              the typewriter below) unspools the text outward; the
              caret rides the leading edge and disappears once fully
              typed. (Vertical padding keeps descenders from clipping
              under overflow:hidden + leading-none.) */}
          {showText && (
            <span
              className="whitespace-nowrap font-mono text-[11px] leading-none"
              style={{
                overflow: "hidden",
                paddingTop: 3,
                paddingBottom: 3,
                color,
                clipPath: "inset(0 0 0 0)",
                animation:
                  phase === "typing"
                    ? `scroll-hint-unfurl ${typeTotalMs}ms linear forwards`
                    : "none",
              }}
            >
              {text.slice(0, typed)}
              {phase === "typing" && (
                <span
                  className="ml-[2px] inline-block align-baseline"
                  style={{
                    width: 1,
                    height: 11,
                    backgroundColor: color,
                    animation:
                      "scroll-hint-caret 0.8s steps(1) infinite",
                  }}
                />
              )}
            </span>
          )}
        </span>
      )}
      <style>{`@keyframes scroll-hint-draw{from{transform:scaleX(0)}to{transform:scaleX(1)}}@keyframes scroll-hint-morph{from{transform:rotate(0deg)}to{transform:rotate(90deg)}}@keyframes scroll-hint-unfurl{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}@keyframes scroll-hint-caret{0%,100%{opacity:1}50%{opacity:0}}`}</style>
    </span>
  );
}
