import { motion } from "framer-motion";

/* ────────────────────────────────────────────
   Shared site footer (+ the `socials` data reused by Contact).
   Rendered on the homepage (App), /admin and /feedback so all
   pages close with the exact same information.
   Quick-nav links use "/#..." (not bare "#...") so they work
   from any route; on the homepage that is still a same-document
   fragment navigation (no reload, smooth scroll preserved).
   ──────────────────────────────────────────── */

export const socials = [
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

/* ────────────────────────────────────────────
   FOOTER
   Calm closing — same dark-green gradient as Projects.
   Logo + quick nav + socials, copyright centered below.
   ──────────────────────────────────────────── */
export default function Footer() {
  const footerLinks = [
    "home",
    "about",
    "skills",
    "projects",
    "testimonials",
    "contact",
  ];

  return (
    <motion.footer
      className="bg-gradient-to-b from-emerald-950 to-emerald-900 dark:from-gray-950 dark:to-emerald-950 text-white dark:text-white"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.9, ease: "easeOut" }}
    >
      <div className="max-w-5xl mx-auto px-6 py-12">
        <p className="text-xs font-mono text-green-400 dark:text-green-400 tracking-widest uppercase mb-8 text-center sm:text-left">
          {"// footer"}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-8">
          {/* Logo — consistent with Navigation */}
          <a href="/#home" className="font-mono text-lg tracking-tight shrink-0">
            <span className="text-green-400 dark:text-green-400">{"<"}</span>
            <span className="font-semibold text-white dark:text-white">Peter</span>
            <span className="text-green-400 dark:text-green-400">{" />"}</span>
          </a>

          {/* Quick nav */}
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {footerLinks.map((l) => (
              <a
                key={l}
                href={`/#${l}`}
                className="text-xs font-mono text-gray-400 dark:text-gray-400 hover:text-green-300 dark:hover:text-green-300 transition-colors duration-300"
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
