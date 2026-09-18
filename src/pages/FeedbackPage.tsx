import { useEffect, useState } from "react";
import { motion } from "framer-motion";

/* ────────────────────────────────────────────
   /feedback — client-facing feedback prototype.
   UI ONLY: no backend, no API, no persistence, no
   connection to /admin yet. Submitting only shows
   the local success state. Local state starts empty.
   Reuses the portfolio's existing tokens: Inter +
   JetBrains Mono, green-600 primary CTA, green-200
   borders, rounded-full pills/buttons, rounded-2xl
   cards, max-w centered px-6 layout, subtle
   fade/slide motion. NOT in the public navbar.
   ──────────────────────────────────────────── */

const MESSAGE_MAX = 1000;
const MESSAGE_MIN = 10;

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
  const shown = hover || value;

  return (
    <div
      className="flex items-center gap-1"
      role="radiogroup"
      aria-label={label}
      aria-invalid={invalid}
      onMouseLeave={() => setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={value === s}
          aria-label={`${s} star${s > 1 ? "s" : ""}`}
          onMouseEnter={() => setHover(s)}
          onFocus={() => setHover(s)}
          onBlur={() => setHover(0)}
          onClick={() => onChange(s)}
          className="p-1.5 -m-1.5 text-2xl sm:text-[1.7rem] leading-none transition-all duration-150 hover:scale-110 active:scale-95"
        >
          <span className={s <= shown ? "text-green-500" : "text-gray-200"}>
            ★
          </span>
        </button>
      ))}
      {value > 0 && (
        <span className="ml-2 text-xs font-mono text-gray-400">
          {value}/5
        </span>
      )}
    </div>
  );
}

export default function FeedbackPage() {
  // Form state — starts empty, never persisted (prototype only).
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [ratings, setRatings] = useState<Record<RatingQuestion["key"], number>>({
    overall: 0,
    professionalism: 0,
    quality: 0,
    communication: 0,
  });
  const [recommend, setRecommend] = useState<"yes" | "unsure" | null>(null);
  const [message, setMessage] = useState("");
  const [permission, setPermission] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedName, setSubmittedName] = useState("");

  useEffect(() => {
    const prev = document.title;
    document.title = "Share Your Experience — Peter Isaac";
    return () => {
      document.title = prev;
    };
  }, []);

  const nameError =
    name.trim().length === 0 ? "Please enter your name." : null;
  const ratingsError = RATING_QUESTIONS.some((q) => ratings[q.key] === 0)
    ? "Please rate all four areas."
    : null;
  const recommendError = recommend === null ? "Please choose an option." : null;
  const messageError =
    message.trim().length === 0
      ? "Please share a few words about your experience."
      : message.trim().length < MESSAGE_MIN
        ? `A little more detail helps (at least ${MESSAGE_MIN} characters).`
        : null;
  const permissionError = !permission
    ? "Please confirm you're happy for your feedback to be displayed."
    : null;

  const hasErrors = Boolean(
    nameError || ratingsError || recommendError || messageError || permissionError
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Prototype only — validate locally, never send anywhere.
    if (hasErrors) {
      setShowErrors(true);
      return;
    }
    setSubmitting(true);
    window.setTimeout(() => {
      setSubmittedName(name.trim());
      setSubmitting(false);
    }, 700);
  };

  if (submittedName) {
    return (
      <main className="bg-white text-gray-900 antialiased min-h-screen">
        <div className="max-w-2xl mx-auto px-6 pt-16 pb-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-xs font-mono text-green-500 tracking-[0.3em] uppercase mb-6">
              Peter Isaac
            </p>
            <div className="mx-auto mb-6 w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <svg
                className="w-7 h-7 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Thank you, {submittedName}!
            </h1>
            <p className="text-gray-600 text-[15px] leading-relaxed mb-2">
              Your feedback has been submitted successfully.
            </p>
            <p className="text-gray-400 text-[15px] leading-relaxed mb-10">
              I really appreciate you taking the time to share your experience.
            </p>
            <a
              href="/"
              className="inline-block px-6 py-3 rounded-full border border-green-200 text-green-700 text-sm font-semibold hover:bg-green-50 transition-colors duration-300"
            >
              Back to Portfolio
            </a>
          </motion.div>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-white text-gray-900 antialiased min-h-screen">
      <div className="max-w-2xl mx-auto px-6 pt-8 pb-20">
        {/* Minimal top row — same pattern as /admin, not the public navbar */}
        <div className="flex items-center justify-between mb-10">
          <a
            href="/"
            className="text-xs font-mono text-gray-400 hover:text-green-600 transition-colors"
          >
            ← Back to portfolio
          </a>
          <a href="/" className="font-mono text-lg tracking-tight">
            <span className="text-green-500">{"<"}</span>
            <span className="font-semibold text-gray-900">Peter</span>
            <span className="text-green-500">{" />"}</span>
          </a>
        </div>

        {/* Intro */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <p className="text-xs font-mono text-green-500 tracking-[0.3em] uppercase mb-4">
            Peter Isaac
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Share Your Experience
          </h1>
          <p className="text-gray-400 text-[15px] leading-relaxed max-w-md mx-auto">
            I&apos;d love to hear about your experience working with me. Your
            feedback helps me improve and helps future clients know what to
            expect.
          </p>
        </motion.div>

        <motion.form
          noValidate
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-10"
        >
          {/* Client info */}
          <section className="space-y-5">
            <div>
              <label
                htmlFor="fb-name"
                className="block text-sm font-semibold text-gray-900 mb-2"
              >
                Your Name <span className="text-green-600">*</span>
              </label>
              <input
                id="fb-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                aria-invalid={showErrors && Boolean(nameError)}
                className="w-full px-4 py-3 rounded-xl border border-green-200 bg-white text-gray-900 text-[15px] placeholder:text-gray-300 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition"
              />
              {showErrors && nameError && (
                <p className="mt-2 text-xs font-mono text-red-500" role="alert">
                  {nameError}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="fb-company"
                className="block text-sm font-semibold text-gray-900 mb-2"
              >
                Company / Project{" "}
                <span className="text-gray-300 font-normal">(optional)</span>
              </label>
              <input
                id="fb-company"
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Company or project name (optional)"
                className="w-full px-4 py-3 rounded-xl border border-green-200 bg-white text-gray-900 text-[15px] placeholder:text-gray-300 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition"
              />
            </div>
          </section>

          {/* Ratings */}
          <section>
            <h2 className="text-sm font-semibold text-gray-900 mb-1">
              Your Ratings <span className="text-green-600">*</span>
            </h2>
            <p className="text-sm text-gray-400 mb-5">
              Tap a star to rate each area.
            </p>
            <div className="p-5 rounded-2xl bg-white shadow-sm border border-green-100/80 space-y-5">
              {RATING_QUESTIONS.map((q) => (
                <div key={q.key}>
                  <p className="text-[11px] font-mono text-gray-400 uppercase tracking-widest mb-1">
                    {q.title}
                  </p>
                  <p className="text-sm text-gray-600 mb-2">{q.hint}</p>
                  <StarRating
                    value={ratings[q.key]}
                    onChange={(v) =>
                      setRatings((prev) => ({ ...prev, [q.key]: v }))
                    }
                    label={q.title}
                    invalid={showErrors && ratings[q.key] === 0}
                  />
                </div>
              ))}
            </div>
            {showErrors && ratingsError && (
              <p className="mt-2 text-xs font-mono text-red-500" role="alert">
                {ratingsError}
              </p>
            )}
          </section>

          {/* Recommendation */}
          <section>
            <h2 className="text-sm font-semibold text-gray-900 mb-4">
              Would you recommend working with Peter?{" "}
              <span className="text-green-600">*</span>
            </h2>
            <div
              className="p-1 rounded-full border border-green-200 bg-white flex gap-1"
              role="radiogroup"
              aria-label="Would you recommend working with Peter?"
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
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setRecommend(opt.value)}
                    className={`flex-1 px-4 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                      selected
                        ? "bg-green-600 text-white shadow-lg shadow-green-600/20"
                        : "text-gray-600 hover:bg-green-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {showErrors && recommendError && (
              <p className="mt-2 text-xs font-mono text-red-500" role="alert">
                {recommendError}
              </p>
            )}
          </section>

          {/* Written feedback */}
          <section>
            <div className="flex items-baseline justify-between gap-3 mb-2">
              <label
                htmlFor="fb-message"
                className="text-sm font-semibold text-gray-900"
              >
                Tell me about your experience{" "}
                <span className="text-green-600">*</span>
              </label>
              <span className="text-xs font-mono text-gray-300 shrink-0">
                {message.length}/{MESSAGE_MAX}
              </span>
            </div>
            <textarea
              id="fb-message"
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MESSAGE_MAX))}
              placeholder="What did you enjoy about working with me? How was the process or final result?"
              rows={5}
              aria-invalid={showErrors && Boolean(messageError)}
              className="w-full px-4 py-3 rounded-2xl border border-green-200 bg-white text-gray-900 text-[15px] leading-relaxed placeholder:text-gray-300 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition resize-y min-h-32"
            />
            {showErrors && messageError && (
              <p className="mt-2 text-xs font-mono text-red-500" role="alert">
                {messageError}
              </p>
            )}
          </section>

          {/* Permission */}
          <section>
            <label
              htmlFor="fb-permission"
              className="flex items-start gap-3 cursor-pointer"
            >
              <input
                id="fb-permission"
                type="checkbox"
                checked={permission}
                onChange={(e) => setPermission(e.target.checked)}
                className="mt-0.5 w-5 h-5 shrink-0 rounded-md border-green-300 accent-green-600 cursor-pointer"
              />
              <span className="text-sm text-gray-600 leading-relaxed">
                I agree to have my feedback displayed on Peter&apos;s
                portfolio. <span className="text-green-600">*</span>
              </span>
            </label>
            {showErrors && permissionError && (
              <p className="mt-2 text-xs font-mono text-red-500" role="alert">
                {permissionError}
              </p>
            )}
          </section>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-8 py-3 rounded-full bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors duration-300 shadow-lg shadow-green-600/20 disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit Feedback"}
            </button>
            <p className="mt-4 text-xs font-mono text-gray-300">
              {"/* prototype — nothing is sent anywhere yet */"}
            </p>
          </div>
        </motion.form>
      </div>
    </main>
  );
}
