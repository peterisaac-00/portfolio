import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { submitTestimonial } from "../lib/testimonials";

/* ────────────────────────────────────────────
   /feedback — private, unlisted client feedback page.
   NOT linked from the navbar, homepage, Testimonials
   section, or any other page. No public entry point:
   clients receive this URL directly as a private link.
   No site navbar/footer — just the entrance animation
   and the form card, centered on the page.

   Entrance: a small green dot fades/scales in, pulses
   once, then morphs (shared layoutId — the dot IS the
   card) into the full form card. Inner content fades in
   after the box is ~80% grown so text never squishes.
   prefers-reduced-motion skips the morph entirely.
   ──────────────────────────────────────────── */

const MESSAGE_MAX = 1000;
const MESSAGE_WARN_AT = 900;
/* Dot presence before morph (spec: ~600–800ms). */
const EXPAND_DELAY_MS = 750;
/* Inner content waits until the box is ~80% grown. */
const CONTENT_DELAY_S = 0.4;
/* Smooth, confident spring — high damping, low bounce. */
const MORPH_TRANSITION = {
  type: "spring" as const,
  stiffness: 260,
  damping: 32,
};

interface RatingQuestion {
  key: "overall" | "professionalism" | "quality" | "communication";
  title: string;
  hint: string;
}

const RATING_QUESTIONS: RatingQuestion[] = [
  {
    key: "overall",
    title: "Overall Experience",
    hint: "How was your overall experience working with Peter?",
  },
  {
    key: "professionalism",
    title: "Professionalism",
    hint: "How would you rate Peter's professionalism?",
  },
  {
    key: "quality",
    title: "Work Quality",
    hint: "How would you rate the quality of the work?",
  },
  {
    key: "communication",
    title: "Communication",
    hint: "How would you rate communication during the project?",
  },
];

/* ────────────────────────────────────────────
   Reveal — inner content fade/slide. Staggered by the
   caller (~100ms steps) so nothing renders mid-morph.
   Renders statically when reduced motion is requested.
   ──────────────────────────────────────────── */
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

/* ────────────────────────────────────────────
   StarRating — reusable (one component, 4 instances).
   Interactive + keyboard accessible: Tab reaches the
   group (roving tabindex), Arrow keys change the rating
   and move focus, Enter/Space activates via the native
   button. Each star announces e.g.
   "Rate Professionalism 4 out of 5 stars".
   ──────────────────────────────────────────── */
function StarRating({
  value,
  onChange,
  label,
  invalid,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
  invalid: boolean;
}) {
  const [hover, setHover] = useState(0);
  const btnRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const shown = hover || value;

  const focusStar = (s: number) => {
    btnRefs.current[s - 1]?.focus();
  };

  const handleGroupKeyDown = (e: React.KeyboardEvent) => {
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      next = value >= 5 ? 5 : value + 1;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      next = value <= 1 ? (value === 0 ? 0 : 1) : value - 1;
    } else if (e.key === "Home") {
      next = 1;
    } else if (e.key === "End") {
      next = 5;
    }
    if (next !== null && next !== 0) {
      e.preventDefault();
      onChange(next);
      focusStar(next);
    } else if (next === 0) {
      e.preventDefault();
    }
  };

  return (
    <div
      className="flex items-center gap-1"
      role="radiogroup"
      aria-label={label}
      aria-invalid={invalid}
      onMouseLeave={() => setHover(0)}
      onKeyDown={handleGroupKeyDown}
    >
      {[1, 2, 3, 4, 5].map((s) => {
        const filled = s <= shown;
        /* Roving tabindex: the selected star (or star 1 when
           unrated) is the single Tab stop; arrows move within. */
        const tabStop = value === 0 ? s === 1 : value === s;
        return (
          <button
            key={s}
            ref={(el) => {
              btnRefs.current[s - 1] = el;
            }}
            type="button"
            role="radio"
            aria-checked={value === s}
            aria-label={`Rate ${label} ${s} out of 5 stars`}
            tabIndex={tabStop ? 0 : -1}
            onMouseEnter={() => setHover(s)}
            onFocus={() => setHover(s)}
            onBlur={() => setHover(0)}
            onClick={() => onChange(s)}
            className="p-1.5 -m-1.5 text-2xl sm:text-[1.7rem] leading-none transition-transform duration-150 hover:scale-110 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ outlineColor: "var(--accent-green)" }}
          >
            <span
              aria-hidden="true"
              style={
                filled
                  ? { color: "var(--accent-green)" }
                  : { color: "var(--text-secondary)", opacity: 0.4 }
              }
            >
              ★
            </span>
          </button>
        );
      })}
      {value > 0 && (
        <span
          className="ml-2 text-xs font-mono"
          style={{ color: "var(--text-secondary)" }}
        >
          {value}/5
        </span>
      )}
    </div>
  );
}

type Recommend = "yes" | "unsure" | null;

export default function FeedbackPage() {
  const reduceMotion = useReducedMotion();
  /* Entrance phase: false = green dot, true = full card.
     Reduced motion starts expanded (plain fade instead). */
  const [expanded, setExpanded] = useState(() => reduceMotion === true);
  const [submitted, setSubmitted] = useState(false);

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [ratings, setRatings] = useState<Record<RatingQuestion["key"], number>>({
    overall: 0,
    professionalism: 0,
    quality: 0,
    communication: 0,
  });
  const [recommend, setRecommend] = useState<Recommend>(null);
  const [message, setMessage] = useState("");
  const [permission, setPermission] = useState(false);
  const [touched, setTouched] = useState({
    name: false,
    ratings: false,
    recommend: false,
    message: false,
    permission: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const cardTitleRef = useRef<HTMLHeadingElement>(null);
  const successTitleRef = useRef<HTMLHeadingElement>(null);
  const recommendYesRef = useRef<HTMLButtonElement>(null);
  const recommendUnsureRef = useRef<HTMLButtonElement>(null);

  /* Unlisted page: noindex/nofollow + descriptive title. */
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Share Your Experience — Peter Isaac";
    let meta = document.querySelector<HTMLMetaElement>(
      'meta[name="robots"]'
    );
    let created = false;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "robots";
      document.head.appendChild(meta);
      created = true;
    }
    const prevContent = meta.content;
    meta.content = "noindex, nofollow";
    return () => {
      document.title = prevTitle;
      if (created) meta.remove();
      else meta.content = prevContent;
    };
  }, []);

  /* Dot presence (~750ms incl. pulse) then morph to card.
     The timer only starts once fonts are ready AND the browser
     has committed an idle frame, so the morph never starts
     mid-font-swap or mid-paint on a fresh page load. */
  useEffect(() => {
    if (reduceMotion || expanded) return;
    let cancelled = false;
    let cleanupTimer: ReturnType<typeof setTimeout> | undefined;
    const start = () => {
      if (cancelled) return;
      requestAnimationFrame(() => {
        if (cancelled) return;
        const t = setTimeout(
          () => !cancelled && setExpanded(true),
          EXPAND_DELAY_MS
        );
        cleanupTimer = t;
      });
    };
    if (document.fonts?.ready) {
      document.fonts.ready.then(start);
    } else {
      start();
    }
    return () => {
      cancelled = true;
      if (cleanupTimer) clearTimeout(cleanupTimer);
    };
  }, [reduceMotion, expanded]);

  /* Move focus into the card once the entrance completes. */
  useEffect(() => {
    if (!expanded) return;
    const delay = reduceMotion ? 150 : 650;
    const t = setTimeout(() => {
      (submitted ? successTitleRef : cardTitleRef).current?.focus({
        preventScroll: true,
      });
    }, delay);
    return () => clearTimeout(t);
  }, [expanded, submitted, reduceMotion]);

  /* Focus the success state when it replaces the form. */
  useEffect(() => {
    if (submitted) {
      const t = setTimeout(
        () => successTitleRef.current?.focus({ preventScroll: true }),
        reduceMotion ? 50 : 350
      );
      return () => clearTimeout(t);
    }
  }, [submitted, reduceMotion]);

  /* ── Validation (inline errors, no alert()) ── */
  const nameError =
    name.trim().length === 0 ? "Please enter your name." : null;
  const ratingsError = RATING_QUESTIONS.some((q) => ratings[q.key] === 0)
    ? "Please rate all four areas."
    : null;
  const recommendError =
    recommend === null ? "Please choose an option." : null;
  const messageError =
    message.trim().length === 0
      ? "Please share a few words about your experience."
      : null;
  const permissionError = !permission
    ? "Please confirm you're happy for your feedback to be displayed."
    : null;

  const isValid = !(
    nameError ||
    ratingsError ||
    recommendError ||
    messageError ||
    permissionError
  );

  const touch = (field: keyof typeof touched) =>
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));

  const setRating = (key: RatingQuestion["key"], v: number) => {
    setRatings((prev) => ({ ...prev, [key]: v }));
    touch("ratings");
  };

  const handleRecommendKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const next: Recommend = recommend === "yes" ? "unsure" : "yes";
      setRecommend(next);
      touch("recommend");
      (next === "yes" ? recommendYesRef : recommendUnsureRef).current?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || submitting) {
      setTouched({
        name: true,
        ratings: true,
        recommend: true,
        message: true,
        permission: true,
      });
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    void (async () => {
      try {
        await submitTestimonial({
          name: name.trim(),
          company: company.trim(),
          overallRating: ratings.overall,
          professionalismRating: ratings.professionalism,
          qualityRating: ratings.quality,
          communicationRating: ratings.communication,
          recommend: recommend === "yes",
          message: message.trim(),
        });
        setSubmitted(true);
      } catch {
        setSubmitError("Couldn't submit your feedback. Please try again.");
      } finally {
        setSubmitting(false);
      }
    })();
  };

  const messageCount = message.length;
  const messageNearLimit = messageCount > MESSAGE_WARN_AT;

  const errorStyle = {
    color: "var(--error)",
  } as const;

  /* ── Card body (form or success) ── */
  const cardBody = submitted ? (
    <div className="text-center py-6">
      <Reveal delay={reduceMotion ? 0 : 0.1}>
        <motion.div
          className="mx-auto mb-6 flex items-center justify-center rounded-full"
          style={{
            width: 56,
            height: 56,
            backgroundColor: "var(--accent-green)",
          }}
          initial={reduceMotion ? { opacity: 0 } : { scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={
            reduceMotion
              ? { duration: 0.2 }
              : { type: "spring", stiffness: 300, damping: 20, delay: 0.1 }
          }
        >
          <svg
            className="h-7 w-7"
            style={{ color: "var(--surface)" }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
            aria-hidden="true"
          >
            <motion.path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={
                reduceMotion ? { duration: 0 } : { duration: 0.4, delay: 0.3 }
              }
            />
          </svg>
        </motion.div>
      </Reveal>
      <Reveal delay={reduceMotion ? 0 : 0.2}>
        <h1
          ref={successTitleRef}
          tabIndex={-1}
          className="text-2xl sm:text-3xl font-bold outline-none"
          style={{ color: "var(--text-primary)" }}
        >
          Thanks for your feedback!
        </h1>
      </Reveal>
      <Reveal delay={reduceMotion ? 0 : 0.3}>
        <p
          className="mt-3 text-[15px] leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          Your feedback goes to review before appearing publicly.
        </p>
      </Reveal>
    </div>
  ) : (
    <form noValidate onSubmit={handleSubmit} aria-label="Feedback form">
      <Reveal delay={reduceMotion ? 0 : CONTENT_DELAY_S}>
        <div className="text-center mb-8">
          <p
            className="text-xs font-mono tracking-[0.3em] uppercase mb-3"
            style={{ color: "var(--accent-green)" }}
          >
            Peter Isaac
          </p>
          <h1
            ref={cardTitleRef}
            tabIndex={-1}
            className="text-3xl sm:text-4xl font-bold mb-3 outline-none"
            style={{ color: "var(--text-primary)" }}
          >
            Share Your Experience
          </h1>
          <p
            className="text-[15px] leading-relaxed max-w-md mx-auto"
            style={{ color: "var(--text-secondary)" }}
          >
            I&apos;d love to hear about your experience working with me. Your
            feedback helps me improve and helps future clients know what to
            expect.
          </p>
        </div>
      </Reveal>

      <div className="space-y-8">
        {/* 1–2. Name + company */}
        <Reveal delay={reduceMotion ? 0 : CONTENT_DELAY_S + 0.1}>
          <div className="space-y-5">
            <div>
              <label
                htmlFor="fb-name"
                className="block text-sm font-semibold mb-2"
                style={{ color: "var(--text-primary)" }}
              >
                Your Name *
              </label>
              <input
                id="fb-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => touch("name")}
                placeholder="Enter your name"
                required
                aria-required="true"
                aria-invalid={touched.name && Boolean(nameError)}
                className="w-full px-4 py-3 rounded-xl text-[15px] transition focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: "var(--input-bg)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                  ["--tw-ring-color" as string]: "var(--accent-green)",
                }}
              />
              {touched.name && nameError && (
                <p className="mt-2 text-xs font-mono" role="alert" style={errorStyle}>
                  {nameError}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="fb-company"
                className="block text-sm font-semibold mb-2"
                style={{ color: "var(--text-primary)" }}
              >
                Company / Project (optional)
              </label>
              <input
                id="fb-company"
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Company or project name"
                className="w-full px-4 py-3 rounded-xl text-[15px] transition focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: "var(--input-bg)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                  ["--tw-ring-color" as string]: "var(--accent-green)",
                }}
              />
            </div>
          </div>
        </Reveal>

        {/* 3. Ratings */}
        <Reveal delay={reduceMotion ? 0 : CONTENT_DELAY_S + 0.2}>
          <div>
            <h2
              className="text-sm font-semibold mb-1"
              style={{ color: "var(--text-primary)" }}
            >
              Your Ratings *
            </h2>
            <p
              className="text-sm mb-4"
              style={{ color: "var(--text-secondary)" }}
            >
              Tap a star to rate each area.
            </p>
            <div
              className="p-5 rounded-2xl space-y-5"
              style={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              {RATING_QUESTIONS.map((q) => (
                <div key={q.key}>
                  <p
                    className="text-[11px] font-mono uppercase tracking-widest mb-1"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {q.title}
                  </p>
                  <p
                    className="text-sm mb-2"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {q.hint}
                  </p>
                  <StarRating
                    value={ratings[q.key]}
                    onChange={(v) => setRating(q.key, v)}
                    label={q.title}
                    invalid={touched.ratings && ratings[q.key] === 0}
                  />
                </div>
              ))}
            </div>
            {touched.ratings && ratingsError && (
              <p className="mt-2 text-xs font-mono" role="alert" style={errorStyle}>
                {ratingsError}
              </p>
            )}
          </div>
        </Reveal>

        {/* 4. Recommend toggle */}
        <Reveal delay={reduceMotion ? 0 : CONTENT_DELAY_S + 0.3}>
          <div>
            <h2
              className="text-sm font-semibold mb-4"
              style={{ color: "var(--text-primary)" }}
              id="fb-recommend-label"
            >
              Would you recommend working with Peter? *
            </h2>
            <div
              className="p-1 rounded-full flex gap-1"
              role="radiogroup"
              aria-labelledby="fb-recommend-label"
              aria-invalid={touched.recommend && Boolean(recommendError)}
              onKeyDown={handleRecommendKeyDown}
              style={{
                backgroundColor: "var(--input-bg)",
                border: "1px solid var(--border)",
              }}
            >
              {(
                [
                  { value: "yes", label: "Yes, definitely" },
                  { value: "unsure", label: "Not sure" },
                ] as const
              ).map((opt) => {
                const selected = recommend === opt.value;
                return (
                  <button
                    key={opt.value}
                    ref={opt.value === "yes" ? recommendYesRef : recommendUnsureRef}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => {
                      setRecommend(opt.value);
                      touch("recommend");
                    }}
                    onBlur={() => touch("recommend")}
                    className="flex-1 px-4 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2"
                    style={
                      selected
                        ? {
                            backgroundColor: "var(--accent-green)",
                            color: "var(--surface)",
                            outlineColor: "var(--accent-green)",
                          }
                        : {
                            color: "var(--text-secondary)",
                            outlineColor: "var(--accent-green)",
                          }
                    }
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {touched.recommend && recommendError && (
              <p className="mt-2 text-xs font-mono" role="alert" style={errorStyle}>
                {recommendError}
              </p>
            )}
          </div>
        </Reveal>

        {/* 5. Written feedback */}
        <Reveal delay={reduceMotion ? 0 : CONTENT_DELAY_S + 0.4}>
          <div>
            <div className="flex items-baseline justify-between gap-3 mb-2">
              <label
                htmlFor="fb-message"
                className="text-sm font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Tell me about your experience *
              </label>
              <span
                className="text-xs font-mono shrink-0"
                aria-live="polite"
                style={{
                  color: messageNearLimit
                    ? "var(--warning)"
                    : "var(--text-secondary)",
                }}
              >
                {messageCount}/{MESSAGE_MAX}
              </span>
            </div>
            <textarea
              id="fb-message"
              value={message}
              onChange={(e) =>
                setMessage(e.target.value.slice(0, MESSAGE_MAX))
              }
              onBlur={() => touch("message")}
              placeholder="What did you enjoy about working with me? How was the process or final result?"
              rows={5}
              maxLength={MESSAGE_MAX}
              required
              aria-required="true"
              aria-invalid={touched.message && Boolean(messageError)}
              aria-describedby="fb-message-count"
              className="w-full px-4 py-3 rounded-2xl text-[15px] leading-relaxed transition resize-y min-h-32 focus:outline-none focus:ring-2"
              style={{
                backgroundColor: "var(--input-bg)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                ["--tw-ring-color" as string]: "var(--accent-green)",
              }}
            />
            <span id="fb-message-count" className="sr-only">
              {messageCount} out of {MESSAGE_MAX} characters used
            </span>
            {touched.message && messageError && (
              <p className="mt-2 text-xs font-mono" role="alert" style={errorStyle}>
                {messageError}
              </p>
            )}
          </div>
        </Reveal>

        {/* 6. Permission */}
        <Reveal delay={reduceMotion ? 0 : CONTENT_DELAY_S + 0.5}>
          <div>
            <label htmlFor="fb-permission" className="flex items-start gap-3 cursor-pointer">
              <input
                id="fb-permission"
                type="checkbox"
                checked={permission}
                onChange={(e) => {
                  setPermission(e.target.checked);
                  touch("permission");
                }}
                onBlur={() => touch("permission")}
                required
                aria-required="true"
                aria-invalid={touched.permission && Boolean(permissionError)}
                className="mt-0.5 w-5 h-5 shrink-0 cursor-pointer"
                style={{ accentColor: "var(--accent-green)" }}
              />
              <span
                className="text-sm leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                I agree to have my feedback displayed on Peter&apos;s portfolio.
              </span>
            </label>
            {touched.permission && permissionError && (
              <p className="mt-2 text-xs font-mono" role="alert" style={errorStyle}>
                {permissionError}
              </p>
            )}
          </div>
        </Reveal>

        {/* 7–8. Submit + helper */}
        <Reveal delay={reduceMotion ? 0 : CONTENT_DELAY_S + 0.6}>
          <div className="pt-2">
            <button
              type="submit"
              disabled={!isValid || submitting}
              aria-busy={submitting}
              className="w-full sm:w-auto px-8 py-3 rounded-full text-sm font-semibold transition-colors duration-300 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{
                backgroundColor: "var(--accent-green)",
                color: "var(--surface)",
                opacity: !isValid || submitting ? 0.55 : 1,
                outlineColor: "var(--accent-green)",
              }}
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="inline-block w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                    style={{ borderColor: "var(--surface)", borderTopColor: "transparent" }}
                  />
                  Submitting…
                </span>
              ) : (
                "Submit Feedback"
              )}
            </button>
            {submitError && (
              <p className="mt-2 text-xs font-mono" role="alert" style={errorStyle}>
                {submitError}
              </p>
            )}
            <p
              className="mt-4 text-xs"
              style={{ color: "var(--text-secondary)" }}
            >
              goes to review before appearing publicly
            </p>
          </div>
        </Reveal>
      </div>
    </form>
  );

  return (
    <main
      className="relative min-h-screen flex items-center justify-center antialiased overflow-hidden"
      style={{ backgroundColor: "var(--page-bg)" }}
    >
      {/* Soft page background treatment — subtle gradient + green
          glow so the card reads as the clear focus. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 45% at 50% 42%, color-mix(in srgb, var(--accent-green) 9%, transparent), transparent 70%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[100px]"
        style={{
          width: 500,
          height: 500,
          backgroundColor: "var(--accent-green)",
          opacity: 0.07,
        }}
      />

      {/* Mobile: card takes most of the viewport width with
          comfortable side padding (px-6 = 24px each side). */}
      <div className="relative z-10 w-full flex justify-center px-6 py-12">
        {!expanded ? (
          /* Phase 1 — the dot. Fades/scales in, pulses once
             (~300ms), then morphs via the shared layoutId. */
          <motion.div
            layoutId="feedback-morph-card"
            role="status"
            aria-label="Loading feedback form"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: [0, 1, 1.25, 1] }}
            transition={{ duration: 0.7, times: [0, 0.4, 0.7, 1], ease: "easeOut" }}
            style={{
              willChange: "transform, border-radius, background-color",
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: "var(--accent-green)",
              boxShadow: "0 0 24px color-mix(in srgb, var(--accent-green) 55%, transparent)",
            }}
          />
        ) : reduceMotion ? (
          /* Reduced motion — skip the morph, fade the card in. */
          <motion.div
            role="region"
            aria-label="Feedback form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="w-full p-6 sm:p-10"
            style={{
              maxWidth: 640,
              borderRadius: 16,
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              boxShadow:
                "0 4px 6px -1px rgb(0 0 0 / 0.06), 0 12px 32px -8px rgb(0 0 0 / 0.12)",
            }}
          >
            {cardBody}
          </motion.div>
        ) : (
          /* Phase 2 — the same element, morphed: 12px circle →
             full card. Geometry via layoutId, surface + radius
             via explicit animation on the same spring. */
          <motion.div
            layoutId="feedback-morph-card"
            role="region"
            aria-label="Feedback form"
            initial={{
              borderRadius: "50%",
              backgroundColor: "var(--accent-green)",
            }}
            animate={{
              borderRadius: 16,
              backgroundColor: "var(--surface)",
            }}
            transition={MORPH_TRANSITION}
            className="w-full p-6 sm:p-10"
            style={{
              willChange: "transform, border-radius, background-color",
              maxWidth: 640,
              border: "1px solid var(--border)",
              boxShadow:
                "0 4px 6px -1px rgb(0 0 0 / 0.06), 0 12px 32px -8px rgb(0 0 0 / 0.12)",
            }}
          >
            {cardBody}
          </motion.div>
        )}
      </div>
    </main>
  );
}
