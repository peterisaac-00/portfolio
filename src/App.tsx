import { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from "react";
import {
  motion,
  useInView,
  AnimatePresence,
  useReducedMotion,
} from "framer-motion";
import ScrollHint from "./components/ScrollHint";

/* ────────────────────────────────────────────
   TEXT SCRAMBLE HOOK
   A "decryption" effect — characters cycle through
   random glyphs before resolving. Rarely seen,
   very fitting for a backend dev portfolio.
   ──────────────────────────────────────────── */
function useTextScramble(text: string, shouldStart: boolean): string {
  const [output, setOutput] = useState(text);
  const glyphs = "01{}[]<>/\\|=+-*αβγδε∞∑∏⟨⟩λμΣ";

  useEffect(() => {
    if (!shouldStart) return;

    let iteration = 0;
    const id = setInterval(() => {
      setOutput(
        text
          .split("")
          .map((ch, i) => {
            if (ch === " ") return " ";
            if (i < iteration) return text[i];
            return glyphs[Math.floor(Math.random() * glyphs.length)];
          })
          .join("")
      );
      iteration += 1 / 2;
      if (iteration > text.length + 1) clearInterval(id);
    }, 35);

    return () => clearInterval(id);
  }, [shouldStart, text]);

  return output;
}

/* ────────────────────────────────────────────
   NETWORK CANVAS BACKGROUND
   Floating nodes + thin connection lines that
   resemble a backend network topology.
   Very subtle — almost like a watermark.
   ──────────────────────────────────────────── */
function NetworkCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;

    let raf: number;
    const COUNT = 45;
    const LINK = 140;

    type P = { x: number; y: number; vx: number; vy: number };
    let particles: P[] = [];

    const resize = () => {
      cvs.width = cvs.offsetWidth * devicePixelRatio;
      cvs.height = cvs.offsetHeight * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
    };

    const seed = () => {
      resize();
      const w = cvs.offsetWidth;
      const h = cvs.offsetHeight;
      particles = Array.from({ length: COUNT }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
      }));
    };

    const draw = () => {
      const w = cvs.offsetWidth;
      const h = cvs.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(34,197,94,0.18)";
        ctx.fill();
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < LINK) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(34,197,94,${0.08 * (1 - d / LINK)})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };

    seed();
    draw();
    window.addEventListener("resize", seed);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", seed);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}

/* ────────────────────────────────────────────
   RANDOM GREEN LINES BACKGROUND
   Thin, faded decorative lines scattered across
   the hero section — like faint circuit traces.
   ──────────────────────────────────────────── */
function GreenLines() {
  const lines = useMemo(() => {
    /* eslint-disable react-hooks/purity */
    return Array.from({ length: 18 }, () => ({
      x1: Math.random() * 100,
      y1: Math.random() * 100,
      x2: Math.random() * 100,
      y2: Math.random() * 100,
      opacity: 0.04 + Math.random() * 0.06,
      strokeWidth: 0.5 + Math.random() * 1.2,
    }));
    /* eslint-enable react-hooks/purity */
  }, []);

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
    >
      {lines.map((l, i) => (
        <line
          key={i}
          x1={`${l.x1}%`}
          y1={`${l.y1}%`}
          x2={`${l.x2}%`}
          y2={`${l.y2}%`}
          stroke="#22c55e"
          strokeWidth={l.strokeWidth}
          opacity={l.opacity}
        />
      ))}
    </svg>
  );
}

/* ────────────────────────────────────────────
   NAVIGATION
   Minimal top bar. Logo looks like a code tag.
   Active section tracked via IntersectionObserver.
   ──────────────────────────────────────────── */
function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("home");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sections = document.querySelectorAll("section[id]");
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id);
        }
      },
      { threshold: 0.35 }
    );
    sections.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, []);

  const links = ["home", "about", "skills", "projects", "contact"];

  return (
    <motion.nav
      className={`fixed top-0 w-full z-50 transition-all duration-500 ${
        scrolled
          ? "bg-white/80 backdrop-blur-lg shadow-[0_1px_0_rgba(34,197,94,0.08)]"
          : "bg-transparent"
      }`}
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
        {/* Logo */}
        <a href="#home" className="font-mono text-lg tracking-tight group">
          <span className="text-green-500 group-hover:text-green-600 transition-colors">
            {"<"}
          </span>
          <span className="font-semibold text-gray-900">Peter</span>
          <span className="text-green-500 group-hover:text-green-600 transition-colors">
            {" />"}
          </span>
        </a>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a
              key={l}
              href={`#${l}`}
              className={`relative text-[13px] uppercase tracking-widest font-medium transition-colors duration-300 ${
                active === l
                  ? "text-green-600"
                  : "text-gray-400 hover:text-green-600"
              }`}
            >
              {l}
              {active === l && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute -bottom-1 left-0 right-0 h-[2px] bg-green-500 rounded-full"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </a>
          ))}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex flex-col gap-[5px] p-2"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span
            className={`block w-5 h-[2px] bg-gray-700 transition-transform duration-300 ${
              menuOpen ? "rotate-45 translate-y-[7px]" : ""
            }`}
          />
          <span
            className={`block w-5 h-[2px] bg-gray-700 transition-opacity duration-300 ${
              menuOpen ? "opacity-0" : ""
            }`}
          />
          <span
            className={`block w-5 h-[2px] bg-gray-700 transition-transform duration-300 ${
              menuOpen ? "-rotate-45 -translate-y-[7px]" : ""
            }`}
          />
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden overflow-hidden bg-white/95 backdrop-blur-lg border-t border-green-100"
          >
            <div className="flex flex-col gap-1 px-6 py-4">
              {links.map((l) => (
                <a
                  key={l}
                  href={`#${l}`}
                  onClick={() => setMenuOpen(false)}
                  className={`py-2 text-sm uppercase tracking-widest font-medium ${
                    active === l ? "text-green-600" : "text-gray-400"
                  }`}
                >
                  {l}
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

/* ────────────────────────────────────────────
   HERO
   Full viewport. Text-scramble name. Typing cursor.
   Green gradient line draws itself under the name.
   ──────────────────────────────────────────── */
function Hero() {
  const [nameReady, setNameReady] = useState(false);
  const [titleReady, setTitleReady] = useState(false);
  const scrambledName = useTextScramble("Peter Isaac", nameReady);
  const scrambledTitle = useTextScramble("Backend Developer", titleReady);

  useEffect(() => {
    const t1 = setTimeout(() => setNameReady(true), 80);
    const t2 = setTimeout(() => setTitleReady(true), 250);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Subtle network background */}
      <NetworkCanvas />

      {/* ★ NEW: Random faded green lines */}
      <GreenLines />

      {/* Faint green glow */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-green-400/[0.04] blur-[100px] pointer-events-none" />

      <div className="relative z-10 text-center px-6">
        {/* Greeting line */}
        <motion.p
          className="text-sm font-mono text-green-500 mb-6 tracking-wider"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          hello world, I'm
        </motion.p>

        {/* Name with scramble */}
        <motion.h1
          className="text-5xl sm:text-6xl md:text-8xl font-extrabold tracking-tight text-gray-900"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {scrambledName}
        </motion.h1>

        {/* Animated gradient underline */}
        <motion.div
          className="mx-auto mt-3 h-[3px] rounded-full bg-gradient-to-r from-green-300 via-green-500 to-emerald-400 animate-gradient"
          initial={{ width: 0 }}
          animate={{ width: 180 }}
          transition={{ delay: 0.7, duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
        />

        {/* Title with scramble */}
        <motion.div
          className="mt-4 flex items-center justify-center gap-1 text-lg sm:text-xl md:text-2xl font-mono"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.95, duration: 0.6 }}
        >
          <span className="text-gray-300 select-none">{">"}</span>
          <span className="text-green-600 font-semibold">{scrambledTitle}</span>
          <span className="cursor-blink text-green-500 select-none">_</span>
        </motion.div>

        {/* Comment line */}
        <motion.p
          className="mt-3 text-xs sm:text-sm font-mono text-gray-300"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8, duration: 0.7 }}
        >
          {"// Building robust systems, one endpoint at a time"}
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          className="mt-8 flex flex-wrap justify-center gap-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.2, duration: 0.5 }}
        >
          <a
            href="#projects"
            className="px-6 py-3 rounded-full bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors duration-300 shadow-lg shadow-green-600/20"
          >
            View My Work
          </a>
          <a
            href="#contact"
            className="px-6 py-3 rounded-full border border-green-200 text-green-700 text-sm font-semibold hover:bg-green-50 transition-colors duration-300"
          >
            Get In Touch
          </a>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5, duration: 0.3 }}
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-green-300/60 flex justify-center pt-2">
            <motion.div
              className="w-1 h-2.5 bg-green-400 rounded-full"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            />
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ────────────────────────────────────────────
   ABOUT
   Two-column layout with animated stats.
   ──────────────────────────────────────────── */
function About() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reducedMotion = useReducedMotion();

  const stats = [
    { value: "20", label: "Years Old" },
    { value: "3+", label: "Years Coding" },
    { value: "∞", label: "Curiosity" },
  ];

  return (
    <section id="about" ref={ref} className="py-28 bg-gradient-to-b from-green-50/60 to-white">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
        >
          <p className="text-xs font-mono text-green-500 tracking-widest uppercase mb-2">
            {"// about"}
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-12">
            About Me
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-5 gap-12 items-start">
          {/* Text */}
          <motion.div
            className="md:col-span-3 space-y-5 text-gray-600 leading-relaxed text-[15px]"
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.15 }}
          >
            <p>
              I'm <span className="text-gray-900 font-semibold">Peter Isaac</span>, a 20-year-old backend developer who lives and breathes server-side architecture. My fascination with how systems communicate, scale, and stay resilient drives everything I build.
            </p>
            <p>
              I specialize in designing and implementing robust APIs, microservices, and distributed systems that handle real-world traffic with grace. From database schema design to deployment pipelines, I care deeply about every layer of the stack.
            </p>
            <p>
              When I'm not writing code, you'll find me exploring new database engines, contributing to open-source projects, or lost in the pages of a system-design whitepaper.
            </p>
            <div className="pt-4 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-mono text-green-600 bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Egypt
              </span>
            </div>
          </motion.div>

          {/* Stats cards */}
          <motion.div
            className="md:col-span-2 space-y-4"
            variants={{
              hidden: {},
              visible: {
                transition: { staggerChildren: 0.15 },
              },
            }}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            {stats.map((s, _i) => (
                <motion.div
                  key={s.label}
                  className="p-5 rounded-2xl bg-white shadow-sm border border-green-100/80 hover:shadow-md hover:border-green-200 transition-all duration-300"
                  variants={{
                    hidden: { opacity: 0, x: -60 },
                    visible: {
                      opacity: 1,
                      x: 0,
                      transition: { duration: 0.5, ease: "easeOut" },
                    },
                  }}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                  animate={reducedMotion ? "visible" : undefined}
                >
                  <div className="text-3xl font-extrabold text-green-600">
                    {s.value}
                  </div>
                  <div className="text-xs text-gray-400 mt-1 uppercase tracking-wider">
                    {s.label}
                  </div>
                </motion.div>
              ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────
   SKILLS
   Grouped tags that stagger in. Hover lift effect.
   ──────────────────────────────────────────── */
const skillGroups = [
  {
    title: "Languages",
    items: ["Go", "Python", "TypeScript", "Rust", "SQL", "Bash"],
  },
  {
    title: "Databases",
    items: ["PostgreSQL", "MongoDB", "Redis", "Cassandra", "SQLite"],
  },
  {
    title: "Infrastructure",
    items: ["Docker", "Kubernetes", "AWS", "Terraform", "CI/CD", "Linux"],
  },
  {
    title: "Protocols & Tools",
    items: ["REST", "GraphQL", "gRPC", "Git", "Nginx", "Kafka"],
  },
];

const skillDetails: Record<string, { usedIn: string[]; experience: string }> = {
  Go: { usedIn: ["Project Alpha", "DataRouter"], experience: "2+ years" },
  Python: { usedIn: ["Fodci AI", "Backend API"], experience: "3+ years" },
  TypeScript: { usedIn: ["FlowEngine", "NetGuard"], experience: "2+ years" },
  Rust: { usedIn: ["CloudVault"], experience: "1+ year" },
  SQL: { usedIn: ["DataPipeline"], experience: "3+ years" },
  Bash: { usedIn: ["CI/CD Pipeline"], experience: "2+ years" },
  PostgreSQL: { usedIn: ["Global4IT", "EnvSync Pro"], experience: "2+ years" },
  MongoDB: { usedIn: ["Project Alpha"], experience: "1+ year" },
  Redis: { usedIn: ["NetGuard", "DataPipeline"], experience: "2+ years" },
  Cassandra: { usedIn: ["DataPipeline"], experience: "1+ year" },
  SQLite: { usedIn: ["FlowEngine"], experience: "1+ year" },
  Docker: { usedIn: ["Fodci AI", "Global4IT"], experience: "2+ years" },
  Kubernetes: { usedIn: ["NetGuard", "EnvSync Pro"], experience: "1+ year" },
  AWS: { usedIn: ["DataPipeline"], experience: "2+ years" },
  Terraform: { usedIn: ["CloudVault"], experience: "1+ year" },
  "CI/CD": { usedIn: ["All Projects"], experience: "3+ years" },
  Linux: { usedIn: ["All Projects"], experience: "4+ years" },
  REST: { usedIn: ["API Layer"], experience: "3+ years" },
  GraphQL: { usedIn: ["NetGuard"], experience: "1+ year" },
  gRPC: { usedIn: ["FlowEngine"], experience: "2+ years" },
  Git: { usedIn: ["All Projects"], experience: "3+ years" },
  Nginx: { usedIn: ["NetGuard"], experience: "1+ year" },
  Kafka: { usedIn: ["DataPipeline"], experience: "1+ year" },
};

function SkillPill({
  name,
  active,
  onHoverChange,
  onSelect,
  onToggle,
}: {
  name: string;
  // Single shared state (owned by `Skills`): only one pill's details
  // are visible at a time. Tapping a pill selects it and it stays
  // visible until a different pill is tapped — no auto-hide timer.
  active: boolean;
  onHoverChange: (hovering: boolean) => void;
  onSelect: () => void;
  onToggle: () => void;
}) {
  const details = skillDetails[name];
  // Horizontal shift so a centered tooltip never paints past the viewport edges.
  // Root cause: whitespace-nowrap + left-1/2 -translate-x-1/2 tooltips overflow on
  // edge pills; html/body overflow-x:hidden then clips them (looks like the section is cut off).
  const [shiftX, setShiftX] = useState(0);
  const tipRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useLayoutEffect(() => {
    if (!active || !tipRef.current) {
      setShiftX(0);
      return;
    }
    const tip = tipRef.current;
    const tipWidth = tip.offsetWidth;
    const pill = tip.offsetParent as HTMLElement | null;
    if (!pill) return;
    const pillRect = pill.getBoundingClientRect();
    const center = pillRect.left + pillRect.width / 2;
    const pad = 12;
    const half = tipWidth / 2;
    let dx = 0;
    if (center - half < pad) dx = pad - (center - half);
    else if (center + half > window.innerWidth - pad)
      dx = window.innerWidth - pad - (center + half);
    setShiftX(dx);
  }, [active, name]);

  return (
    <motion.span
      className="relative inline-flex"
      tabIndex={0}
      role="button"
      aria-label={`${name} skill details`}
      aria-expanded={active}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      // Touch: tapping selects this pill (stays open; tapping another
      // pill moves the selection there). No auto-hide on touch end.
      onTouchStart={() => onSelect()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        } else if (e.key === "Escape" && active) {
          onToggle();
        }
      }}
      variants={{
        hidden: { opacity: 0, y: 15 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.35, ease: "easeOut" },
        },
      }}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      animate={reducedMotion ? "visible" : undefined}
    >
      {/* Hover scale lives on the chip only so it does not enlarge/shift the tooltip */}
      <motion.span
        className="px-4 py-2 rounded-full bg-green-50 text-green-700 text-sm font-medium border border-green-100 cursor-default select-none"
        whileHover={{
          scale: 1.08,
          y: -3,
          backgroundColor: "#dcfce7",
          borderColor: "#86efac",
          transition: { duration: 0.2 },
        }}
      >
        {name}
      </motion.span>
      {active && details && (
        <AnimatePresence>
          {/* Wrapper owns horizontal clamp; inner motion.div owns enter/exit y so transforms don't fight */}
          <div
            ref={tipRef}
            className="absolute bottom-full left-1/2 mb-2 z-50 w-max max-w-[min(16rem,calc(100vw-1.5rem))]"
            style={{ transform: `translateX(calc(-50% + ${shiftX}px))` }}
          >
            <motion.div
              className="relative px-3 py-2 rounded-xl bg-slate-50 border border-emerald-200 shadow-sm shadow-emerald-100"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.2 }}
            >
              <div className="text-xs font-mono text-green-700 font-semibold mb-1">
                {name}
              </div>
              <div className="text-[11px] font-mono text-slate-600">
                Used in: {details.usedIn.join(", ")}
              </div>
              <div className="text-[11px] font-mono text-slate-600">
                Experience:{" "}
                <span className="text-amber-600 font-semibold">
                  {details.experience}
                </span>
              </div>
              {/* Counter-shift arrow so it still points at the pill center */}
              <div
                className="absolute bottom-[-5px] w-2.5 h-2.5 bg-slate-50 border-r border-b border-emerald-200 rotate-45"
                style={{
                  left: `calc(50% - ${shiftX}px)`,
                  transform: "translateX(-50%)",
                }}
              />
            </motion.div>
          </div>
        </AnimatePresence>
      )}
    </motion.span>
  );
}

function Skills() {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  // Which pill's details are visible (null = none). Shared so that
  // tapping a different skill moves the selection there instead of
  // stacking tooltips, and nothing auto-hides on a timer.
  const [activeSkill, setActiveSkill] = useState<string | null>(null);

  return (
    <section id="skills" ref={ref} className="py-28 bg-white">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.7 }}
        >
          <p className="text-xs font-mono text-green-500 tracking-widest uppercase mb-2">
            {"// skills"}
          </p>
          {/* Heading + hint share a shrink-wrapped flex row (w-fit, no
              justify-between) so the hint always sits directly next to
              the heading text; it wraps below only if both truly don't
              fit on one line. */}
          <div className="mb-14 flex w-fit max-w-full flex-wrap items-center gap-x-3 gap-y-2">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 max-w-full break-words">
              Skills & Tools
            </h2>
            <ScrollHint
              text="Tap on a skill to view details"
              color="#000"
            />
          </div>
        </motion.div>

        <motion.div
          className="space-y-10"
          variants={{
            hidden: {},
            visible: {
              transition: { staggerChildren: 0.15 },
            },
          }}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          animate={reducedMotion ? "visible" : undefined}
        >
          {skillGroups.map((group) => (
            <motion.div
              key={group.title}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { staggerChildren: 0.06 },
                },
              }}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              animate={reducedMotion ? "visible" : undefined}
            >
              <motion.h3
                variants={{
                  hidden: { opacity: 0, y: -10 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.4 },
                  },
                }}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                animate={reducedMotion ? "visible" : undefined}
                className="text-xs font-mono text-gray-400 uppercase tracking-widest mb-4 max-w-full break-words"
              >
                {group.title}
              </motion.h3>
              <div className="flex flex-wrap gap-2.5">
                {group.items.map((item) => (
                  <SkillPill
                    key={item}
                    name={item}
                    active={activeSkill === item}
                    onHoverChange={(hovering) =>
                      setActiveSkill(hovering ? item : null)
                    }
                    onSelect={() => setActiveSkill(item)}
                    onToggle={() =>
                      setActiveSkill((cur) => (cur === item ? null : item))
                    }
                  />
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────
   PROJECTS DATA (expanded)
   ──────────────────────────────────────────── */
interface Project {
  name: string;
  desc: string;
  fullDesc: string;
  tech: string[];
  github: string;
  demo: string;
  image: string;
  detailImages: string[];
}

const projects: Project[] = [
  {
    name: "FlowEngine",
    desc: "A high-performance workflow orchestration engine in Go. Handles complex DAG-based task scheduling with automatic retries and real-time observability.",
    fullDesc:
      "FlowEngine is a production-grade workflow orchestration engine written in Go, designed to manage complex DAG-based task pipelines at scale. It features automatic retry mechanisms with exponential backoff, failure recovery with checkpointing, and a real-time observability dashboard. The engine supports dynamic workflow composition, parallel execution branches, and conditional routing. Built with gRPC for efficient inter-service communication and PostgreSQL for durable state management, FlowEngine can process thousands of workflow transitions per second while maintaining strict consistency guarantees.",
    tech: ["Go", "gRPC", "PostgreSQL", "Docker"],
    github: "https://github.com/peterisaac/flowengine",
    demo: "https://flowengine.demo.dev",
    image: "/images/flowengine.jpg",
    detailImages: ["/images/flowengine-detail.jpg"],
  },
  {
    name: "DataPipeline",
    desc: "Real-time data processing pipeline capable of ingesting and transforming millions of events per second with exactly-once delivery semantics.",
    fullDesc:
      "DataPipeline is a high-throughput, real-time data processing system built in Python that can ingest, transform, and route millions of events per second. It implements exactly-once delivery semantics using idempotent producers and transactional consumers backed by Kafka. The pipeline supports pluggable transformation stages, schema evolution with backward compatibility, and automatic scaling based on consumer lag metrics. Deployed on AWS with Terraform-managed infrastructure, it includes comprehensive monitoring dashboards and automated alerting for production reliability.",
    tech: ["Python", "Kafka", "Redis", "AWS"],
    github: "https://github.com/peterisaac/datapipeline",
    demo: "https://datapipeline.demo.dev",
    image: "/images/datapipeline.jpg",
    detailImages: ["/images/datapipeline-detail.jpg"],
  },
  {
    name: "CloudVault",
    desc: "A secure distributed key-value store implementing Raft consensus for strong consistency guarantees across multi-region deployments.",
    fullDesc:
      "CloudVault is a distributed, fault-tolerant key-value store implemented in Rust that provides strong consistency guarantees through the Raft consensus algorithm. It supports multi-region deployments with automatic leader election, log replication, and split-brain prevention. The storage engine uses an LSM-tree architecture optimized for write-heavy workloads with automatic compaction and bloom filters for fast lookups. CloudVault exposes both a gRPC and REST API, supports ACID transactions within a partition, and includes a comprehensive CLI tool for cluster management and monitoring.",
    tech: ["Rust", "Raft", "gRPC", "Terraform"],
    github: "https://github.com/peterisaac/cloudvault",
    demo: "https://cloudvault.demo.dev",
    image: "/images/cloudvault.jpg",
    detailImages: ["/images/cloudvault-detail.jpg"],
  },
  {
    name: "NetGuard",
    desc: "An intelligent API gateway with adaptive rate limiting, request caching, circuit breaking, and a real-time analytics dashboard.",
    fullDesc:
      "NetGuard is an intelligent API gateway built in Node.js that acts as a protective shield for backend services. It features adaptive rate limiting that adjusts thresholds based on traffic patterns, multi-tier caching with cache invalidation strategies, and circuit breaker patterns that prevent cascade failures. The gateway supports request/response transformation, authentication middleware, and traffic shadowing for safe testing. Its real-time analytics dashboard provides visibility into request latencies, error rates, and throughput metrics, enabling proactive performance optimization and incident response.",
    tech: ["Node.js", "Redis", "Kubernetes", "GraphQL"],
    github: "https://github.com/peterisaac/netguard",
    demo: "https://netguard.demo.dev",
    image: "/images/netguard.jpg",
    detailImages: ["/images/netguard-detail.jpg"],
  },
];

/* ────────────────────────────────────────────
   PROJECT DETAIL MODAL
   Covers 75% of the screen. Shows full project
   details, images, GitHub & demo links.
   ──────────────────────────────────────────── */
function ProjectModal({
  project,
  onClose,
}: {
  project: Project;
  onClose: () => void;
}) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* Modal content — 75% of viewport */}
      <motion.div
        className="relative z-10 w-full max-w-4xl bg-gradient-to-b from-emerald-950 to-emerald-900 rounded-3xl border border-white/10 overflow-hidden flex flex-col"
        style={{ height: "75vh" }}
        initial={{ opacity: 0, scale: 0.92, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 30 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 sm:px-8 pt-6 sm:pt-8 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.4)]" />
            <h2 className="text-xl sm:text-2xl font-bold text-green-300">
              {project.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center transition-colors group"
            aria-label="Close"
          >
            <svg
              className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-6">
          {/* Main image */}
          <div className="rounded-2xl overflow-hidden border border-white/[0.06]">
            <img
              src={project.image}
              alt={project.name}
              className="w-full h-48 sm:h-64 object-cover"
            />
          </div>

          {/* Full description */}
          <p className="text-gray-300 text-sm leading-relaxed">
            {project.fullDesc}
          </p>

          {/* Detail images */}
          {project.detailImages.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-4">
              {project.detailImages.map((img, i) => (
                <div
                  key={i}
                  className="rounded-2xl overflow-hidden border border-white/[0.06]"
                >
                  <img
                    src={img}
                    alt={`${project.name} screenshot ${i + 1}`}
                    className="w-full h-40 sm:h-48 object-cover"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Tech stack */}
          <div>
            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-3">
              Tech Stack
            </h3>
            <div className="flex flex-wrap gap-2">
              {project.tech.map((t) => (
                <span
                  key={t}
                  className="text-xs px-3 py-1.5 rounded-md bg-green-900/40 text-green-300/80 border border-green-800/30 font-mono"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer with links */}
        <div className="px-6 sm:px-8 py-5 border-t border-white/[0.06] flex flex-wrap gap-3">
          <a
            href={project.github}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-white text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            View on GitHub
          </a>
          <a
            href={project.demo}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors shadow-lg shadow-green-600/20"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
            Live Demo
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ────────────────────────────────────────────
   PROJECTS SECTION
   Dark-green section. Frosted-glass cards
   with project images. Click opens detail modal.
   ──────────────────────────────────────────── */
function Projects() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [selected, setSelected] = useState<Project | null>(null);
  const handleCloseModal = useCallback(() => setSelected(null), []);

  return (
    <>
      <section
        id="projects"
        ref={ref}
        className="py-28 bg-gradient-to-b from-emerald-950 to-emerald-900 text-white"
      >
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7 }}
          >
            <p className="text-xs font-mono text-green-400 tracking-widest uppercase mb-2">
              {"// projects"}
            </p>
            {/* Same shrink-wrapped heading + hint row as Skills, so the
                white hint sits directly next to the heading text. */}
            <div className="mb-14 flex w-fit max-w-full flex-wrap items-center gap-x-3 gap-y-2">
              <h2 className="text-3xl sm:text-4xl font-bold max-w-full break-words">
                Featured Work
              </h2>
              <ScrollHint
                text="Tap on a project to view details"
                color="#fff"
              />
            </div>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-5">
            {projects.map((p, i) => (
<motion.article
                 key={p.name}
                 className="group relative p-5 pb-6 rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/[0.07] hover:bg-white/[0.08] hover:border-green-400/20 transition-all duration-500 cursor-pointer"
                 initial={{ opacity: 0, y: 30 }}
                 animate={inView ? { opacity: 1, y: 0 } : {}}
                 transition={{ duration: 0.6, delay: i * 0.12 }}
                 whileHover={{ y: -6, transition: { duration: 0.25 } }}
                 onClick={() => setSelected(p)}
               >
                 <div className="flex gap-4">
                   {/* Project image */}
                   <div className="flex-shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border border-white/[0.06]">
                     <img
                       src={p.image}
                       alt={p.name}
                       className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                     />
                   </div>

                   {/* Text content */}
                   <div className="flex-1 min-w-0">
                     {/* Status dot + name */}
                     <div className="flex items-center gap-2 mb-2">
                       <span className="w-2 h-2 rounded-full bg-green-400 group-hover:shadow-[0_0_8px_rgba(74,222,128,0.5)] transition-shadow" />
                       <h3 className="text-lg font-bold text-green-300">
                         {p.name}
                       </h3>
                     </div>

                     <p className="text-gray-300 text-sm leading-relaxed mb-3 line-clamp-3">
                       {p.desc}
                     </p>

                     <div className="flex flex-wrap gap-1.5">
                       {p.tech.map((t) => (
                         <span
                           key={t}
                           className="text-[11px] px-2 py-0.5 rounded-md bg-green-900/40 text-green-300/80 border border-green-800/30 font-mono"
                         >
                           {t}
                         </span>
                       ))}
                     </div>
                   </div>
                 </div>

                 {/* Click hint — always visible; transparency comes from text-green-400/40 */}
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* Project detail modal */}
      <AnimatePresence>
        {selected && (
          <ProjectModal
            project={selected}
            onClose={handleCloseModal}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* ────────────────────────────────────────────
   CONTACT
   Clean footer with social links.
   ──────────────────────────────────────────── */
const socials = [
  { label: "GitHub", href: "https://github.com/peterisaac-00", icon: "GH" },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/peter-isaac-138623332/",
    icon: "LI",
  },
  { label: "Email", href: "mailto:lunagleam1@gmail.com", icon: "@" },
  {
    label: "Twitter / X",
    href: "https://x.com/peterisaac_0",
    icon: "X",
  },
  {
    label: "WhatsApp",
    href: "https://wa.me/201211295898?text=Hi%20Peter%2C%20I%20found%20your%20portfolio%20and%20wanted%20to%20reach%20out",
    icon: "WA",
  },
];

function Contact() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="contact" ref={ref} className="pt-28 pb-20 bg-white">
      <div className="max-w-5xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
        >
          <p className="text-xs font-mono text-green-500 tracking-widest uppercase mb-2">
            {"// contact"}
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Let's Connect
          </h2>
          <p className="text-gray-400 max-w-md mx-auto text-[15px] leading-relaxed mb-14">
            I'm always open to discussing new projects, creative ideas, or
            opportunities to be part of something great.
          </p>
        </motion.div>

        <motion.div
          className="flex flex-wrap justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.25 }}
        >
          {socials.map((s) => (
            <motion.a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 px-5 py-3 rounded-full border border-green-200 hover:bg-green-50 hover:border-green-400 transition-all duration-300"
              whileHover={{ y: -2 }}
            >
              <span className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-mono text-xs font-bold group-hover:bg-green-200 transition-colors">
                {s.icon}
              </span>
              <span className="text-gray-600 text-sm font-medium">
                {s.label}
              </span>
            </motion.a>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────
   FOOTER
   Calm closing — same dark-green gradient as Projects.
   Logo + quick nav + socials, copyright centered below.
   ──────────────────────────────────────────── */
function Footer() {
  const footerLinks = ["home", "about", "skills", "projects", "contact"];

  return (
    <motion.footer
      className="bg-gradient-to-b from-emerald-950 to-emerald-900 text-white"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.9, ease: "easeOut" }}
    >
      <div className="max-w-5xl mx-auto px-6 py-12">
        <p className="text-xs font-mono text-green-400 tracking-widest uppercase mb-8 text-center sm:text-left">
          {"// footer"}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-8">
          {/* Logo — consistent with Navigation */}
          <a href="#home" className="font-mono text-lg tracking-tight shrink-0">
            <span className="text-green-400">{"<"}</span>
            <span className="font-semibold text-white">Peter</span>
            <span className="text-green-400">{" />"}</span>
          </a>

          {/* Quick nav */}
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {footerLinks.map((l) => (
              <a
                key={l}
                href={`#${l}`}
                className="text-xs font-mono text-gray-400 hover:text-green-300 transition-colors duration-300"
              >
                {l}
              </a>
            ))}
          </nav>

          {/* Socials — reuses the `socials` array above */}
          <div className="flex items-center gap-3">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                title={s.label}
                className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-green-300 font-mono text-xs font-bold hover:bg-white/[0.12] hover:border-green-400/20 transition-all duration-300"
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>

        {/* Bottom line — copyright moved out of Contact */}
        <div className="mt-10 pt-6 border-t border-white/[0.06] text-center">
          <p className="text-xs font-mono text-green-200/40">
            {"/* © " +
              new Date().getFullYear() +
              " Peter Isaac — backend by day, backend by night. */"}
          </p>
        </div>
      </div>
    </motion.footer>
  );
}

/* ────────────────────────────────────────────
   APP — puts it all together
   ──────────────────────────────────────────── */
export default function App() {
  return (
    <main className="bg-white text-gray-900 antialiased">
      <Navigation />
      <Hero />
      <About />
      <Skills />
      <Projects />
      <Contact />
      <Footer />
    </main>
  );
}
