import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

/* ────────────────────────────────────────────
   Client testimonial spotlight — public display card
   on the main single-scrolling page, between Projects
   and Contact.

   Typed data object so entries are easy to swap or add
   later (only one exists for now — no grid, no carousel).
   Read-only: overall rating only (the four category
   ratings stay private for Peter's review), recommend
   badge when applicable, no buttons/links/CTAs.

   Same green-dot-morphs-into-a-card mechanic and same
   tokens (var(--surface), --border, --text-*, --accent-
   green), radius (16px) and shadow depth as the private
   /feedback card — one design system. Triggered once on
   scroll into view (~45% visible); never replays.
   Passive content: never steals keyboard focus.
   ──────────────────────────────────────────── */

export interface ClientTestimonial {
  name: string;
  /** Company / role, e.g. "Product Manager, TechFlow". */
  company: string;
  overall: number;
  professionalism: number;
  quality: number;
  communication: number;
  recommend: boolean;
  message: string;
}

export const TESTIMONIALS: ClientTestimonial[] = [
  {
    name: "Sarah Mitchell",
    company: "Product Manager, TechFlow",
    overall: 5,
    professionalism: 5,
    quality: 5,
    communication: 5,
    recommend: true,
    message:
      "Peter took our unstable API and turned it into something we never have to think about. Clear communication throughout, solid architecture underneath, and exactly what was promised on delivery.",
  },
];

/* Dot presence before morph (spec: ~600–800ms). */
const EXPAND_DELAY_MS = 700;
/* Inner content waits until the box is ~80% grown. */
const CONTENT_DELAY_S = 0.4;
/* Smooth, confident spring — high damping, low bounce. */
const MORPH_TRANSITION = {
  type: "spring" as const,
  stiffness: 260,
  damping: 32,
};

const CARD_SHADOW =
  "0 4px 6px -1px rgb(0 0 0 / 0.06), 0 12px 32px -8px rgb(0 0 0 / 0.12)";

/* Inner content fade/slide, staggered by the caller
   (~100ms steps) so nothing renders mid-morph. */
function Reveal({
  delay,
  children,
}: {
  delay: number;
  children: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return <>{children}</>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

/* Read-only overall-rating stars (public card shows only
   the Overall Experience rating — keep it simple). */
function OverallStars({ value }: { value: number }) {
  const safe = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <span
      role="img"
      aria-label={`Rated ${safe} out of 5 stars`}
      className="text-xl leading-none tracking-[0.2em]"
      style={{ color: "var(--accent-green)" }}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          style={i < safe ? undefined : { opacity: 0.3 }}
        >
          ★
        </span>
      ))}
    </span>
  );
}

function TestimonialCard({ t }: { t: ClientTestimonial }) {
  const reduceMotion = useReducedMotion();
  return (
    <>
      <Reveal delay={reduceMotion ? 0 : CONTENT_DELAY_S}>
        <div className="text-center">
          <span
            aria-hidden="true"
            className="block font-serif leading-none select-none"
            style={{
              fontSize: 64,
              color: "var(--accent-green)",
              opacity: 0.85,
              marginBottom: -12,
            }}
          >
            &ldquo;
          </span>
          <blockquote>
            <p
              className="text-lg sm:text-xl italic leading-relaxed"
              style={{ color: "var(--text-primary)" }}
            >
              {t.message}
            </p>
          </blockquote>
        </div>
      </Reveal>

      <Reveal delay={reduceMotion ? 0 : CONTENT_DELAY_S + 0.1}>
        <div
          aria-hidden="true"
          className="mx-auto my-6"
          style={{
            width: 48,
            height: 1,
            backgroundColor: "var(--border)",
          }}
        />
        <p
          className="text-center font-semibold text-[15px]"
          style={{ color: "var(--text-primary)" }}
        >
          {t.name}
        </p>
        <p
          className="text-center text-sm mt-1"
          style={{ color: "var(--text-secondary)" }}
        >
          {t.company}
        </p>
      </Reveal>

      <Reveal delay={reduceMotion ? 0 : CONTENT_DELAY_S + 0.2}>
        <div className="mt-5 flex justify-center">
          <OverallStars value={t.overall} />
        </div>
      </Reveal>

      {t.recommend && (
        <Reveal delay={reduceMotion ? 0 : CONTENT_DELAY_S + 0.3}>
          <div className="mt-5 flex justify-center">
            <span
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{
                color: "var(--accent-green)",
                border: "1px solid var(--border)",
                backgroundColor:
                  "color-mix(in srgb, var(--accent-green) 8%, transparent)",
              }}
            >
              <svg
                aria-hidden="true"
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Recommends working with Peter
            </span>
          </div>
        </Reveal>
      )}
    </>
  );
}

export default function Testimonials() {
  const reduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  /* Fires once at ~45% section visibility; never replays. */
  const inView = useInView(sectionRef, { once: true, amount: 0.45 });
  const [expanded, setExpanded] = useState(false);

  /* Dot presence, then morph to card. */
  useEffect(() => {
    if (!inView || reduceMotion || expanded) return;
    const t = setTimeout(() => setExpanded(true), EXPAND_DELAY_MS);
    return () => clearTimeout(t);
  }, [inView, reduceMotion, expanded]);

  const showDot = inView && !reduceMotion && !expanded;
  const showCard = inView && (reduceMotion || expanded);
  const testimonial = TESTIMONIALS[0];

  return (
    <section
      ref={sectionRef}
      aria-label="Client testimonial"
      className="relative py-28 overflow-hidden"
      style={{ backgroundColor: "var(--page-bg)" }}
    >
      {/* Screen-reader heading so the section announces as a
          distinct landmark; visual design stays pure card. */}
      <h2 className="sr-only">Client testimonial</h2>

      {/* Faint spotlight glow (decorative). */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[100px]"
        style={{
          width: 480,
          height: 480,
          backgroundColor: "var(--accent-green)",
          opacity: 0.06,
        }}
      />

      {/* Before trigger: empty invisible space (section padding
          keeps the page rhythm; nothing looks broken). */}
      <div className="relative z-10 flex justify-center px-6">
        {showDot && (
          /* Phase 1 — the dot. Appears centered, pulses, then
             morphs via the shared layoutId. */
          <motion.div
            layoutId="testimonial-morph-card"
            aria-hidden="true"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: [0, 1, 1.25, 1] }}
            transition={{
              duration: 0.7,
              times: [0, 0.4, 0.7, 1],
              ease: "easeOut",
            }}
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: "var(--accent-green)",
              boxShadow:
                "0 0 24px color-mix(in srgb, var(--accent-green) 55%, transparent)",
            }}
          />
        )}

        {showCard &&
          (reduceMotion ? (
            /* Reduced motion — fade the finished card in. */
            <motion.div
              role="region"
              aria-label="Client testimonial"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
              className="w-full px-6 py-10 sm:px-12"
              style={{
                maxWidth: 760,
                borderRadius: 16,
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
                boxShadow: CARD_SHADOW,
              }}
            >
              <TestimonialCard t={testimonial} />
            </motion.div>
          ) : (
            /* Phase 2 — the same element, morphed: 12px circle
               → full card. Geometry via layoutId, surface +
               radius via explicit animation on the same spring. */
            <motion.div
              layoutId="testimonial-morph-card"
              role="region"
              aria-label="Client testimonial"
              initial={{
                borderRadius: "50%",
                backgroundColor: "var(--accent-green)",
              }}
              animate={{
                borderRadius: 16,
                backgroundColor: "var(--surface)",
              }}
              transition={MORPH_TRANSITION}
              className="w-full px-6 py-10 sm:px-12"
              style={{
                maxWidth: 760,
                border: "1px solid var(--border)",
                boxShadow: CARD_SHADOW,
              }}
            >
              <TestimonialCard t={testimonial} />
            </motion.div>
          ))}
      </div>
    </section>
  );
}
